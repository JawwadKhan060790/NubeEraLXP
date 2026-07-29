import React, { useState, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, 
  Download, ArrowRight, RefreshCw, Building2, HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface School {
  id: string;
  name: string;
}

interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

type ImportType = 'students' | 'attendance' | 'teacher-schedule' | 'mcqs';

export default function DataImport() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [importType, setImportType] = useState<ImportType>('students');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [schoolsLoading, setSchoolsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Fetch schools on mount
  useEffect(() => {
    (async () => {
      try {
        setSchoolsLoading(true);
        const { data } = await api.get('/schools');
        const raw = Array.isArray(data) ? data : (data.value || []);
        const mapped = raw.map((s: any) => ({
          id: s.id || s.Id,
          name: s.name || s.Name || 'Unknown School'
        }));
        setSchools(mapped);
        if (mapped.length > 0) {
          setSelectedSchoolId(mapped[0].id);
        }
      } catch (err) {
        toast.error('Failed to load schools.');
      } finally {
        setSchoolsLoading(false);
      }
    })();
  }, []);

  const templates: Record<ImportType, { title: string; headers: string[]; desc: string; sample: string[][] }> = {
    students: {
      title: 'Students & Parents Template',
      desc: 'Creates both student and parent user logins (default password: 123456). Will automatically map to matching Grade names and create Sections dynamically if they don\'t exist.',
      headers: [
        'First Name', 'Last Name', 'Email', 'Student ID', 'Roll No', 'Phone',
        'Grade Name', 'Section Code', 'Parent Guardian Name', 'Parent Guardian Phone',
        'Parent Guardian Email', 'Gender', 'Address', 'Date Of Birth'
      ],
      sample: [
        ['John', 'Doe', 'john.doe@school.edu', 'STU-001', '10', '1234567890', 'Grade 1', 'A', 'Richard Doe', '0987654321', 'richard@doe.com', 'Male', '123 Main St', '2015-05-12'],
        ['Jane', 'Smith', '', 'STU-002', '12', '', 'Grade 2', 'B', 'Mary Smith', '5551234567', '', 'Female', '456 Oak Rd', '2014-08-20']
      ]
    },
    attendance: {
      title: 'Attendance Registry Template',
      desc: 'Imports attendance logs for students in the school. Matches student by Student ID, Roll No, or Email.',
      headers: ['Student ID', 'Date', 'Status', 'Remarks'],
      sample: [
        ['STU-001', '2026-07-23', 'Present', 'On time'],
        ['STU-002', '2026-07-23', 'Absent', 'Sick leave']
      ]
    },
    'teacher-schedule': {
      title: 'Teacher Schedule Template',
      desc: 'Imports teacher classes/sessions. Matches teacher by Email, Employee ID, or Full Name. Module/Unit and Lesson/Topic names are optional.',
      headers: ['Teacher Email', 'Grade Name', 'Section Code', 'Date', 'Start Time', 'End Time', 'Module Name', 'Lesson Name'],
      sample: [
        ['math.teacher@school.edu', 'Grade 1', 'A', '2026-07-25', '09:00:00', '10:00:00', 'Algebra Intro', 'Variables Topic'],
        ['science.teacher@school.edu', 'Grade 2', 'B', '2026-07-25', '10:30:00', '11:30:00', '', '']
      ]
    },
    mcqs: {
      title: 'MCQ (Exams & Questions) Template',
      desc: 'Imports exam questions under the specified Exam Title. Will look up or create the Exam dynamically.',
      headers: ['Exam Title', 'Grade Name', 'Section Code', 'Unit Name', 'Topic Name', 'Duration Mins', 'Total Marks', 'Release Date', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'],
      sample: [
        ['Midterm Quiz', 'Grade 1', 'A', 'Algebra Intro', 'Variables Topic', '60', '100', '2026-07-30 10:00', 'What is 2x + 5 = 15? Solve for x.', '2', '5', '10', '15', 'B'],
        ['Midterm Quiz', 'Grade 1', 'A', 'Algebra Intro', 'Variables Topic', '60', '100', '2026-07-30 10:00', 'Which option represents a variable?', 'x', '7', 'Present', 'None', 'A']
      ]
    }
  };

  const currentTemplate = templates[importType];

  // CSV Generator for templates
  const downloadTemplateCsv = () => {
    const csvContent = [
      currentTemplate.headers.join(','),
      ...currentTemplate.sample.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${importType}-template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) {
      toast.error('Please select a school.');
      return;
    }
    if (!file) {
      toast.error('Please select a file to import.');
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('schoolId', selectedSchoolId);
    formData.append('file', file);

    try {
      const response = await api.post(`/bulk-import/${importType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
      if (response.data.success) {
        toast.success(`Successfully imported ${response.data.importedCount} record(s).`);
        setFile(null);
      } else {
        toast.error('Import completed with errors.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during bulk import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title & Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-8">
          <FileSpreadsheet className="w-80 h-80" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-white/20 text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full backdrop-blur-md">
            Administration Tools
          </span>
          <h1 className="text-3xl font-extrabold mt-3 tracking-tight">Bulk Data Import Center</h1>
          <p className="text-violet-100/90 text-sm mt-2 leading-relaxed">
            Upload student rosters, attendance logs, teacher schedules, or question banks in bulk. Match records against schools and automatically generate student and parent accounts instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-violet-500" />
            Upload Configuration
          </h2>

          <form onSubmit={handleImport} className="space-y-5">
            {/* School Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Target Institution / Campus
              </label>
              <div className="relative">
                {schoolsLoading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="w-4 h-4 text-violet-500 animate-spin" />
                  </div>
                ) : null}
                <select
                  disabled={schoolsLoading}
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 dark:text-slate-200 transition-all font-medium"
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Import Type Selector Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Import Data Category
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['students', 'attendance', 'teacher-schedule', 'mcqs'] as ImportType[]).map((type) => {
                  const active = importType === type;
                  const labelMap: Record<ImportType, string> = {
                    students: 'Students',
                    attendance: 'Attendance',
                    'teacher-schedule': 'Schedules',
                    mcqs: 'MCQ Exams'
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setImportType(type);
                        setFile(null);
                        setResult(null);
                      }}
                      className={`
                        py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer text-center
                        ${active
                          ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-500 text-violet-700 dark:text-violet-400 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      {labelMap[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File Drag and Drop Area */}
            <div
              className={`
                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 relative
                ${dragActive 
                  ? 'border-violet-500 bg-violet-50/30 dark:bg-violet-500/5' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="p-3 bg-violet-50 dark:bg-violet-500/10 rounded-xl mb-4 text-violet-600 dark:text-violet-400">
                <Upload className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Drag and drop your spreadsheet here
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Supports Excel (.xlsx, .xls) and CSV files
              </p>
              
              {file && (
                <div className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Import trigger button */}
            <button
              type="submit"
              disabled={loading || !file}
              className={`
                w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer
                ${loading || !file
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
                }
              `}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Spreadsheet...
                </>
              ) : (
                <>
                  Proceed to Import
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Help / Template Panel */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4.5 h-4.5 text-violet-500" />
                Template Info
              </h2>
              <button
                onClick={downloadTemplateCsv}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Get CSV Template
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {currentTemplate.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {currentTemplate.desc}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Required Headers ({currentTemplate.headers.length})
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentTemplate.headers.map((hdr, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200/40 dark:border-slate-700/40"
                  >
                    {hdr}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-400 dark:text-slate-500 flex flex-col gap-2">
            <span>• Supported formats: <b>.xlsx, .xls, .csv</b></span>
            <span>• Date format: <b>YYYY-MM-DD</b></span>
            <span>• Password for all new student & parent accounts defaults to: <b>123456</b></span>
          </div>
        </div>
      </div>

      {/* Import Result Panel */}
      {result && (
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            {result.success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-500" />
            )}
            <div>
              <h3 className="text-md font-bold text-slate-800 dark:text-white">
                Import Session Results
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Processed with {result.errors.length} error(s)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400">Total Imported</span>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                {result.importedCount}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400">Errors Encountered</span>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">
                {result.errors.length}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-400">Status</span>
              <span className={`inline-block mx-auto mt-2 px-3 py-1 rounded-full text-xs font-bold ${result.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                {result.success ? 'Success' : 'Partial Completed'}
              </span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block mb-2">
                Detailed Error Logs
              </span>
              <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/20 rounded-xl p-4 max-h-[250px] overflow-y-auto space-y-1.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-rose-400 select-none">•</span>
                    <p>{err}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
