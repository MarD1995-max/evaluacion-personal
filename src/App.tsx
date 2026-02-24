import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Upload, ChevronDown, Filter, Info, CheckCircle2, AlertCircle, Download, Lock, User, Camera, PenTool, Save, LogOut, ShieldCheck, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import SignaturePad from 'signature_pad';

// Types
interface EvaluationData {
  gerencia: string;
  area: string;
  puesto: string;
  colaborador: string;
  competencia: string;
}

interface ScoreState {
  [colaborador: string]: {
    [competencia: string]: number;
  };
}

interface AuthUser {
  email: string;
  password: string;
  name: string;
  assignedArea: string;
}

const AUTHORIZED_USERS: AuthUser[] = [
  { email: 'marlon@empresa.com', password: '123', name: 'Marlon Ruiz', assignedArea: 'Hornos eléctricos' },
  { email: 'juan@empresa.com', password: '123', name: 'Juan Perez', assignedArea: 'Refractarios' },
  { email: 'admin@empresa.com', password: 'admin', name: 'Administrador', assignedArea: 'TALENTO Y DESARROLLO HUMANO' },
];

// Pre-stored template data
const INITIAL_DATA: EvaluationData[] = [
  // Hornos eléctricos (Marlon Ruiz)
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'OPERADOR DE HORNO', colaborador: 'JUAN VALDEZ', competencia: 'OPERACIÓN DE PANEL' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'OPERADOR DE HORNO', colaborador: 'JUAN VALDEZ', competencia: 'SEGURIDAD EN FUNDICIÓN' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'OPERADOR DE HORNO', colaborador: 'JUAN VALDEZ', competencia: 'CONTROL DE TEMPERATURA' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'OPERADOR DE HORNO', colaborador: 'PEDRO PICAPIEDRA', competencia: 'OPERACIÓN DE PANEL' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'OPERADOR DE HORNO', colaborador: 'PEDRO PICAPIEDRA', competencia: 'SEGURIDAD EN FUNDICIÓN' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'OPERADOR DE HORNO', colaborador: 'PEDRO PICAPIEDRA', competencia: 'CONTROL DE TEMPERATURA' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'TECNICO DE MANTENIMIENTO', colaborador: 'CARLOS RUIZ', competencia: 'MANTENIMIENTO PREVENTIVO' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'TECNICO DE MANTENIMIENTO', colaborador: 'CARLOS RUIZ', competencia: 'DIAGNOSTICO DE FALLAS' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'AYUDANTE GENERAL', colaborador: 'JOSE LOPEZ', competencia: 'LIMPIEZA DE AREA' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Hornos eléctricos', puesto: 'AYUDANTE GENERAL', colaborador: 'JOSE LOPEZ', competencia: 'APOYO EN CARGA' },
  
  // Refractarios (Juan Perez)
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Refractarios', puesto: 'TECNICO REFRACTARIO', colaborador: 'LUIS LINO', competencia: 'MEZCLA DE MATERIAL' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Refractarios', puesto: 'TECNICO REFRACTARIO', colaborador: 'LUIS LINO', competencia: 'APLICACIÓN DE MORTERO' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Refractarios', puesto: 'TECNICO REFRACTARIO', colaborador: 'MARIO NAVARRETE', competencia: 'MEZCLA DE MATERIAL' },
  { gerencia: 'GERENCIA DE PRODUCCION', area: 'Refractarios', puesto: 'TECNICO REFRACTARIO', colaborador: 'MARIO NAVARRETE', competencia: 'APLICACIÓN DE MORTERO' },

  // Talento Humano (Admin)
  { gerencia: 'GESTION DE CAPITAL HUMANO', area: 'TALENTO Y DESARROLLO HUMANO', puesto: 'ANALISTA DE TALENTO HUMANO', colaborador: 'MARLON RUIZ', competencia: 'COMPETENCIA 1' },
  { gerencia: 'GESTION DE CAPITAL HUMANO', area: 'TALENTO Y DESARROLLO HUMANO', puesto: 'ANALISTA DE TALENTO HUMANO', colaborador: 'MARLON RUIZ', competencia: 'COMPETENCIA 2' },
  { gerencia: 'GESTION DE CAPITAL HUMANO', area: 'TALENTO Y DESARROLLO HUMANO', puesto: 'ANALISTA DE TALENTO HUMANO', colaborador: 'DANIEL DAVILA', competencia: 'COMPETENCIA 1' },
  { gerencia: 'GESTION DE CAPITAL HUMANO', area: 'TALENTO Y DESARROLLO HUMANO', puesto: 'ANALISTA DE TALENTO HUMANO', colaborador: 'DANIEL DAVILA', competencia: 'COMPETENCIA 2' },
];

const LEVELS = [
  { value: 0, label: 'NIVEL 0', short: 'Desconoce', desc: 'El colaborador desconoce los fundamentos básicos de la competencia.' },
  { value: 1, label: 'NIVEL 1', short: 'En aprendizaje', desc: 'El colaborador evidencia conocimiento a nivel básico, sin llegar a completar actividades de la competencia.' },
  { value: 2, label: 'NIVEL 2', short: 'En desarrollo', desc: 'El colaborador logra el desarrollo de la competencia, evidencia dificultad para su término.' },
  { value: 3, label: 'NIVEL 3', short: 'Promedio', desc: 'El colaborador evidencia el dominio de la competencia alineado al estándar establecido dentro del área.' },
];

export default function App() {
  // Auth State
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // App State
  const [data, setData] = useState<EvaluationData[]>(INITIAL_DATA);
  const [scores, setScores] = useState<ScoreState>({});
  const [filters, setFilters] = useState({
    gerencia: '',
    area: '',
    puesto: '',
  });
  const [isLocked, setIsLocked] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidence, setEvidence] = useState({
    photo: '',
    signature: '',
    fullName: '',
  });

  // Refs
  const webcamRef = useRef<Webcam>(null);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  // Initialize Signature Pad
  useEffect(() => {
    if (showEvidenceModal && signatureRef.current) {
      signaturePadRef.current = new SignaturePad(signatureRef.current);
    }
  }, [showEvidenceModal]);

  // Auth Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = AUTHORIZED_USERS.find(u => u.email === loginForm.email && u.password === loginForm.password);
    if (found) {
      setUser(found);
      setLoginError('');
      
      // Auto-filter based on user's assigned area
      const userAreaMatch = data.find(d => d.area === found.assignedArea);
      if (userAreaMatch) {
        setFilters({
          gerencia: userAreaMatch.gerencia,
          area: userAreaMatch.area,
          puesto: userAreaMatch.puesto,
        });
      }
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginForm({ email: '', password: '' });
    setIsLocked(false);
    setShowEvidenceModal(false);
    setFilters({ gerencia: '', area: '', puesto: '' });
  };

  // Filter Options (Restricted by User Role)
  const filteredData = useMemo(() => {
    if (!user) return [];
    if (user.email === 'admin@empresa.com') return data;
    return data.filter(d => d.area === user.assignedArea);
  }, [data, user]);

  const gerencias = useMemo(() => Array.from(new Set(filteredData.map(d => d.gerencia))), [filteredData]);
  const areas = useMemo(() => 
    Array.from(new Set(filteredData.filter(d => d.gerencia === filters.gerencia).map(d => d.area))), 
    [filteredData, filters.gerencia]
  );
  const puestos = useMemo(() => 
    Array.from(new Set(filteredData.filter(d => d.gerencia === filters.gerencia && d.area === filters.area).map(d => d.puesto))), 
    [filteredData, filters.gerencia, filters.area]
  );

  // Table Data
  const dataByPuesto = useMemo<{ [puesto: string]: { colaboradores: string[], competencias: string[] } }>(() => {
    const areaData = filteredData.filter(d => d.area === filters.area);
    const grouped: { [puesto: string]: { colaboradores: string[], competencias: string[] } } = {};
    
    areaData.forEach(item => {
      if (!grouped[item.puesto]) {
        grouped[item.puesto] = { colaboradores: [], competencias: [] };
      }
      if (!grouped[item.puesto].colaboradores.includes(item.colaborador)) {
        grouped[item.puesto].colaboradores.push(item.colaborador);
      }
      if (!grouped[item.puesto].competencias.includes(item.competencia)) {
        grouped[item.puesto].competencias.push(item.competencia);
      }
    });
    
    return grouped;
  }, [filteredData, filters.area]);

  const handleScoreChange = (colab: string, comp: string, val: number) => {
    if (isLocked) return;
    setScores(prev => ({
      ...prev,
      [colab]: {
        ...(prev[colab] || {}),
        [comp]: val
      }
    }));
  };

  const calculatePercentage = (colab: string, competencias: string[]) => {
    if (competencias.length === 0) return 0;
    const colabScores = scores[colab] || {};
    const totalScore = competencias.reduce((sum, comp) => sum + (colabScores[comp] || 0), 0);
    const maxPossible = competencias.length * 3;
    return Math.round((totalScore / maxPossible) * 100);
  };

  const getStatus = (pct: number) => {
    if (pct >= 70) return { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (pct >= 50) return { label: 'Con oportunidad de mejora', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Desaprobado', color: 'bg-rose-100 text-rose-700 border-rose-200' };
  };

  // Save and Evidence Flow
  const handleSave = () => {
    // Validation: Check if all workers in the area have scores for all their competencies
    let firstMissingElement: HTMLElement | null = null;
    let incomplete = false;

    (Object.entries(dataByPuesto) as [string, { colaboradores: string[], competencias: string[] }][]).forEach(([puesto, info]) => {
      info.colaboradores.forEach(colab => {
        info.competencias.forEach(comp => {
          const score = scores[colab]?.[comp];
          if (score === undefined || score === null) {
            incomplete = true;
            if (!firstMissingElement) {
              const el = document.getElementById(`select-${colab}-${comp}`);
              if (el) firstMissingElement = el;
            }
          }
        });
      });
    });

    if (incomplete) {
      alert("Atención: Debe completar la puntuación de todo el personal identificado antes de guardar la evaluación.");
      if (firstMissingElement) {
        firstMissingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstMissingElement.focus();
      }
      return;
    }

    const confirmSave = window.confirm("Una vez guardados los datos no podrá modificar los puntajes. ¿Está seguro de continuar?");
    if (confirmSave) {
      setIsLocked(true);
      setShowEvidenceModal(true);
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setEvidence(prev => ({ ...prev, photo: imageSrc }));
    }
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const finalizeEvaluation = async () => {
    if (!evidence.fullName) {
      alert("Por favor ingrese su nombre completo.");
      return;
    }
    if (signaturePadRef.current?.isEmpty()) {
      alert("Por favor firme la evaluación.");
      return;
    }

    const sigData = signaturePadRef.current?.toDataURL();
    const finalEvidence = { ...evidence, signature: sigData || '' };

    // Prepare Excel Data
    const resultsData: any[] = [];
    (Object.entries(dataByPuesto) as [string, { colaboradores: string[], competencias: string[] }][]).forEach(([puesto, info]) => {
      info.colaboradores.forEach(colab => {
        info.competencias.forEach(comp => {
          resultsData.push({
            Colaborador: colab,
            Puesto: puesto,
            Competencia: comp,
            Puntaje: scores[colab]?.[comp] ?? 0,
            Area: filters.area,
            Gerencia: filters.gerencia,
            Fecha: new Date().toLocaleString()
          });
        });
      });
    });

    const activityData = [{
      Evaluador: user?.name,
      Email: user?.email,
      AreaAsignada: user?.assignedArea,
      NombreEvidencia: finalEvidence.fullName,
      FechaFinalizacion: new Date().toLocaleString(),
      Foto: "Ver en sistema (Base64)",
      Firma: "Ver en sistema (Base64)"
    }];

    // Export Excel
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(resultsData);
    const ws2 = XLSX.utils.json_to_sheet(activityData);
    XLSX.utils.book_append_sheet(wb, ws1, "Resultados");
    XLSX.utils.book_append_sheet(wb, ws2, "Actividades Evaluador");
    XLSX.writeFile(wb, `Evaluacion_${filters.area}_${user?.name}.xlsx`);

    // Export PDF (Evaluator version)
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFontSize(18);
    pdf.text("Resumen de Evaluación de Competencias", 20, 20);
    pdf.setFontSize(12);
    pdf.text(`Evaluador: ${user?.name}`, 20, 30);
    pdf.text(`Área: ${filters.area}`, 20, 37);
    pdf.text(`Fecha: ${new Date().toLocaleString()}`, 20, 44);

    let y = 60;
    (Object.entries(dataByPuesto) as [string, { colaboradores: string[], competencias: string[] }][]).forEach(([puesto, info]) => {
      pdf.setFont("helvetica", "bold");
      pdf.text(`Puesto: ${puesto}`, 20, y);
      y += 7;
      pdf.setFont("helvetica", "normal");
      info.colaboradores.forEach(colab => {
        const pct = calculatePercentage(colab, info.competencias);
        pdf.text(`- ${colab}: ${pct}% (${getStatus(pct).label})`, 25, y);
        y += 6;
        if (y > 270) { pdf.addPage(); y = 20; }
      });
      y += 5;
    });

    if (finalEvidence.signature) {
      pdf.addPage();
      pdf.text("Evidencia de Firma:", 20, 20);
      pdf.addImage(finalEvidence.signature, 'PNG', 20, 30, 60, 30);
      pdf.text(`Nombre: ${finalEvidence.fullName}`, 20, 70);
    }

    pdf.save(`Evaluacion_${filters.area}_${user?.name}.pdf`);

    setShowEvidenceModal(false);
    alert("Evaluación finalizada. Se han descargado los archivos Excel y PDF.");
  };

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#004a7c] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-[#004a7c]">
              <Lock size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Acceso al Sistema</h1>
            <p className="text-slate-500">Ingresa tus credenciales de evaluador</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Correo Electrónico</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={loginForm.email}
                  onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a7c]/20 focus:border-[#004a7c] outline-none transition-all"
                  placeholder="ejemplo@empresa.com"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">Contraseña</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a7c]/20 focus:border-[#004a7c] outline-none transition-all"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            {loginError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} /> {loginError}
              </motion.div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-[#004a7c] text-white font-bold rounded-xl hover:bg-[#003a63] transition-colors shadow-lg shadow-blue-900/20"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              Marlon Ruiz: marlon@empresa.com / 123
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl text-[#004a7c]">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#004a7c]">Bienvenido, {user.name}</h1>
              <p className="text-slate-500 text-sm">Evaluador asignado a: <span className="font-semibold">{user.assignedArea}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isLocked && (
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20"
              >
                <Save size={18} /> Guardar Evaluación
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={24} />
            </button>
          </div>
        </header>

        {/* Approval Limits Horizontal Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <ShieldCheck className="text-emerald-600" size={20} />
            <span className="text-sm font-bold text-emerald-700">Mayor o igual a 70%: Aprobado</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <TrendingUp className="text-amber-600" size={20} />
            <span className="text-sm font-bold text-amber-700">50% - 69%: Con oportunidad de mejora</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertTriangle className="text-rose-600" size={20} />
            <span className="text-sm font-bold text-rose-700">Menor a 50%: Desaprobado</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Filter size={12} /> Gerencia
              </label>
              <div className="relative">
                <select 
                  value={filters.gerencia}
                  onChange={(e) => setFilters(f => ({ ...f, gerencia: e.target.value, area: '', puesto: '' }))}
                  disabled={isLocked}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004a7c]/20 focus:border-[#004a7c] transition-all disabled:opacity-50"
                >
                  <option value="">Seleccionar Gerencia</option>
                  {gerencias.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Filter size={12} /> Área
              </label>
              <div className="relative">
                <select 
                  value={filters.area}
                  onChange={(e) => setFilters(f => ({ ...f, area: e.target.value, puesto: '' }))}
                  disabled={isLocked}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#004a7c]/20 focus:border-[#004a7c] transition-all disabled:opacity-50"
                >
                  <option value="">Seleccionar Área</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          {/* Evaluation Tables */}
          {filters.area ? (
            <div className="space-y-8">
              {(Object.entries(dataByPuesto) as [string, { colaboradores: string[], competencias: string[] }][]).map(([puesto, info]) => (
                <div key={puesto} className={`bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all ${isLocked ? 'ring-4 ring-amber-100' : ''}`}>
                  <div className="bg-[#004a7c] px-6 py-3 flex items-center justify-between text-white">
                    <h2 className="font-bold uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={18} /> {puesto}
                    </h2>
                    {isLocked && (
                      <div className="flex items-center gap-2 text-xs font-bold uppercase">
                        <Lock size={14} /> Bloqueada
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="p-4 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-200 min-w-[250px]">
                            Competencias
                          </th>
                          {info.colaboradores.map(colab => (
                            <th key={colab} className="p-4 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-200 min-w-[150px]">
                              {colab}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {info.competencias.map((comp, idx) => (
                          <tr key={comp} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                            <td className="p-4 text-sm font-medium text-slate-700 border-r border-slate-200">
                              {comp}
                            </td>
                            {info.colaboradores.map(colab => (
                              <td key={colab} className="p-4 border-r border-slate-200">
                                <div className="relative">
                                  <select 
                                    id={`select-${colab}-${comp}`}
                                    value={scores[colab]?.[comp] ?? ''}
                                    onChange={(e) => handleScoreChange(colab, comp, Number(e.target.value))}
                                    disabled={isLocked}
                                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#004a7c]/20 focus:border-[#004a7c] transition-all cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="" disabled>-</option>
                                    {[0, 1, 2, 3].map(v => (
                                      <option key={v} value={v}>{v}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={12} />
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold">
                          <td className="p-4 text-sm uppercase tracking-wider text-[#004a7c] border-r border-slate-200">
                            Estado y Porcentaje
                          </td>
                          {info.colaboradores.map(colab => {
                            const pct = calculatePercentage(colab, info.competencias);
                            const status = getStatus(pct);
                            return (
                              <td key={colab} className="p-4 text-center border-r border-slate-200">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${status.color}`}>
                                    {status.label}
                                  </span>
                                  <span className="text-sm font-bold text-slate-700">
                                    {pct}%
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
              <Filter size={48} className="mb-4 opacity-20" />
              <p>Selecciona un área para comenzar la evaluación</p>
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#004a7c] px-6 py-3 flex items-center gap-2 text-white">
              <div className="flex items-center gap-2">
                <Info size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Leyenda de Puntuación</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 text-left font-semibold">Nivel</th>
                    <th className="px-6 py-3 text-left font-semibold">Nombre Corto</th>
                    <th className="px-6 py-3 text-left font-semibold">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {LEVELS.map(level => (
                    <tr key={level.value} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#004a7c]">{level.label}</td>
                      <td className="px-6 py-4 font-medium">{level.short}</td>
                      <td className="px-6 py-4 text-slate-500">{level.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Evidence Modal */}
      <AnimatePresence>
        {showEvidenceModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-[#004a7c] p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={24} />
                  <h2 className="text-xl font-bold">Evidencia de Evaluación</h2>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Photo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Camera size={20} /> Registro Fotográfico
                  </div>
                  <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                    {!evidence.photo ? (
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        className="w-full h-full object-cover"
                        mirrored={false}
                        imageSmoothing={true}
                        forceScreenshotSourceSize={false}
                        disablePictureInPicture={true}
                        onUserMedia={() => {}}
                        onUserMediaError={() => {}}
                      />
                    ) : (
                      <img src={evidence.photo} className="w-full h-full object-cover" alt="Evidencia" />
                    )}
                  </div>
                  <button 
                    onClick={evidence.photo ? () => setEvidence(p => ({ ...p, photo: '' })) : capturePhoto}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      evidence.photo ? 'bg-slate-100 text-slate-600' : 'bg-[#004a7c] text-white shadow-lg'
                    }`}
                  >
                    <Camera size={18} /> {evidence.photo ? 'Tomar otra foto' : 'Capturar Foto'}
                  </button>
                </div>

                {/* Right Side: Signature & Name */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nombre Completo del Evaluador</label>
                    <input 
                      type="text"
                      value={evidence.fullName}
                      onChange={e => setEvidence(p => ({ ...p, fullName: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a7c]/20 outline-none"
                      placeholder="Ingresa tu nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <PenTool size={16} /> Firma Digital
                      </label>
                      <button onClick={clearSignature} className="text-xs text-red-500 font-bold hover:underline">Limpiar</button>
                    </div>
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-48 relative">
                      <canvas ref={signatureRef} className="w-full h-full cursor-crosshair" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                <button 
                  onClick={() => { setShowEvidenceModal(false); setIsLocked(false); }}
                  className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={finalizeEvaluation}
                  className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
