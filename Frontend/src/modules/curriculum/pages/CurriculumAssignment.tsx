import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Search,
  Square,
  X,
  BookOpen,
  Layers,
  Maximize2,
  Minimize2
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import ConfirmModal from '@/components/ConfirmModal';
import GradeLevelSelect from '@/components/GradeLevelSelect';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/services/api';
import { schoolCurriculumService } from '@/services/schoolCurriculumService';
import { schoolService } from '@/services/schoolService';

import type {
  BulkCurriculumAssignmentResult,
  SchoolCurriculumCatalogItem,
} from '@/types/curriculum.types';
import type { School } from '@/types/school.types';

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border text-[9px] px-2 py-0.5
    ${active ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/25' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-400/25'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#283548] flex items-center justify-center mb-3 text-slate-300 dark:text-[#475569]">
      {icon}
    </div>
    <p className="text-sm font-bold text-slate-400 dark:text-[#64748b]">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748b] mt-1">{subtitle}</p>}
  </div>
);

interface GroupedUnit {
  unit: SchoolCurriculumCatalogItem;
  topics: SchoolCurriculumCatalogItem[];
}

const CurriculumAssignment: React.FC = () => {
  const { confirmState, requestConfirm } = useConfirm();

  const [schools, setSchools] = useState<School[]>([]);
  const [assignSchoolId, setAssignSchoolId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [catalog, setCatalog] = useState<SchoolCurriculumCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearchInput, setCatalogSearchInput] = useState('');
  const [catalogAssignedFilter, setCatalogAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selected, setSelected] = useState<Map<string, 'Unit' | 'Topic'>>(new Map());
  const [initialSelected, setInitialSelected] = useState<Map<string, 'Unit' | 'Topic'>>(new Map());
  const [assignNotes, setAssignNotes] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const fetchSchools = async () => {
    try {
      setSchools(await schoolService.getSchools());
    } catch (e) {
      console.error('Failed to fetch schools', e);
    }
  };

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      // Fetch both Units and Topics at once with a large page size.
      // If no school is selected, query using an empty Guid to load the master catalog.
      const resp = await schoolCurriculumService.getCatalog({
        schoolId: assignSchoolId || '00000000-0000-0000-0000-000000000000',
        page: 1,
        pageSize: 1000,
      });
      setCatalog(resp.items);
      const newSelected = new Map<string, 'Unit' | 'Topic'>();
      resp.items.forEach((item) => {
        if (item.is_assigned_to_school) {
          newSelected.set(item.id, item.entity_type);
        }
      });
      setInitialSelected(newSelected);
      setSelected(newSelected);
    } catch (e) {
      console.error('Failed to fetch curriculum catalog', e);
      toast.error('Failed to load curriculum catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    setSelectedSubjectId('');
    if (selectedGradeId) {
      api.get('/subjects', { params: { gradeId: selectedGradeId } })
        .then((res) => {
          setSubjects(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to load subjects', err);
          setSubjects([]);
        });
    } else {
      setSubjects([]);
    }
  }, [selectedGradeId]);

  useEffect(() => {
    setSelected(new Map());
    setInitialSelected(new Map());
    setSelectedGradeId('');
    setSelectedSubjectId('');
    setExpandedUnits(new Set());
    fetchCatalog();
  }, [assignSchoolId]);

  // Group and filter catalog items client-side
  const groupedData = useMemo<GroupedUnit[]>(() => {
    const units = catalog.filter((item) => item.entity_type === 'Unit');
    const topics = catalog.filter((item) => item.entity_type === 'Topic');

    const searchLower = catalogSearchInput.toLowerCase().trim();

    return units
      .map((unit) => {
        const unitTopics = topics.filter((t) => t.parent_unit_id === unit.id);
        return { unit, topics: unitTopics };
      })
      .filter(({ unit, topics: unitTopics }) => {
        // Filter by Grade Level (Units/Topics are school-agnostic master content
        // keyed only by canonical GradeLevel)
        if (selectedGradeId && unit.grade_level_id !== selectedGradeId) {
          return false;
        }

        // Filter by Subject
        if (selectedSubjectId && unit.subject_id !== selectedSubjectId) {
          return false;
        }

        // Filter by Assignment Status
        if (catalogAssignedFilter === 'assigned') {
          const hasAssignedTopic = unitTopics.some((t) => t.is_assigned_to_school);
          if (!unit.is_assigned_to_school && !hasAssignedTopic) return false;
        } else if (catalogAssignedFilter === 'unassigned') {
          const hasUnassignedTopic = unitTopics.some((t) => !t.is_assigned_to_school);
          if (unit.is_assigned_to_school && !hasUnassignedTopic) return false;
        }

        // Filter by Search Query
        if (searchLower) {
          const unitMatches = unit.name.toLowerCase().includes(searchLower) || (unit.code && unit.code.toLowerCase().includes(searchLower));
          const topicMatches = unitTopics.some((t) => t.name.toLowerCase().includes(searchLower) || (t.code && t.code.toLowerCase().includes(searchLower)));
          return unitMatches || topicMatches;
        }

        return true;
      })
      .map(({ unit, topics: unitTopics }) => {
        // If we filtered topics by search query, we should also filter the visible topics list
        let visibleTopics = unitTopics;
        if (searchLower) {
          visibleTopics = unitTopics.filter((t) => t.name.toLowerCase().includes(searchLower) || (t.code && t.code.toLowerCase().includes(searchLower)));
        }

        // Apply Assignment Status filter to visible topics
        if (catalogAssignedFilter === 'assigned') {
          visibleTopics = visibleTopics.filter((t) => t.is_assigned_to_school);
        } else if (catalogAssignedFilter === 'unassigned') {
          visibleTopics = visibleTopics.filter((t) => !t.is_assigned_to_school);
        }

        return { unit, topics: visibleTopics };
      });
  }, [catalog, catalogSearchInput, catalogAssignedFilter, selectedGradeId, selectedSubjectId]);

  const toggleExpand = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = groupedData.map((g) => g.unit.id);
    setExpandedUnits(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedUnits(new Set());
  };

  const handleUnitCheckboxChange = (unitItem: SchoolCurriculumCatalogItem, unitTopics: SchoolCurriculumCatalogItem[]) => {
    const isSelected = selected.has(unitItem.id);
    setSelected((prev) => {
      const next = new Map(prev);
      if (isSelected) {
        // Deselect Unit
        next.delete(unitItem.id);
        // Deselect all its child Topics
        unitTopics.forEach((t) => next.delete(t.id));
      } else {
        // Select Unit
        next.set(unitItem.id, 'Unit');
        // Select all its child Topics
        unitTopics.forEach((t) => next.set(t.id, 'Topic'));
      }
      return next;
    });
  };

  const handleTopicCheckboxChange = (
    topicItem: SchoolCurriculumCatalogItem,
    unitItem: SchoolCurriculumCatalogItem,
    unitTopics: SchoolCurriculumCatalogItem[]
  ) => {
    const isSelected = selected.has(topicItem.id);
    setSelected((prev) => {
      const next = new Map(prev);
      if (isSelected) {
        next.delete(topicItem.id);
        // If unchecking any child topic, the parent Unit checkbox should also uncheck
        next.delete(unitItem.id);
      } else {
        next.set(topicItem.id, 'Topic');
        // If all topics in the unit are checked, check the parent Unit too
        const allOthersChecked = unitTopics
          .filter((t) => t.id !== topicItem.id)
          .every((t) => next.has(t.id));
        if (allOthersChecked) {
          next.set(unitItem.id, 'Unit');
        }
      }
      return next;
    });
  };

  const isAllVisibleSelected = useMemo(() => {
    if (groupedData.length === 0) return false;
    return groupedData.every(({ unit, topics }) => {
      if (!selected.has(unit.id)) return false;
      return topics.every((t) => selected.has(t.id));
    });
  }, [groupedData, selected]);

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (isAllVisibleSelected) {
        // Deselect all visible Units and Topics
        groupedData.forEach(({ unit, topics }) => {
          next.delete(unit.id);
          topics.forEach((t) => next.delete(t.id));
        });
      } else {
        // Select all visible Units and Topics
        groupedData.forEach(({ unit, topics }) => {
          next.set(unit.id, 'Unit');
          topics.forEach((t) => next.set(t.id, 'Topic'));
        });
      }
      return next;
    });
  };

  const { toAssign, toUnassign } = useMemo(() => {
    const toAssignUnits: string[] = [];
    const toAssignTopics: string[] = [];
    const toUnassignUnits: string[] = [];
    const toUnassignTopics: string[] = [];

    selected.forEach((type, id) => {
      if (!initialSelected.has(id)) {
        if (type === 'Unit') toAssignUnits.push(id);
        else toAssignTopics.push(id);
      }
    });

    initialSelected.forEach((type, id) => {
      if (!selected.has(id)) {
        if (type === 'Unit') toUnassignUnits.push(id);
        else toUnassignTopics.push(id);
      }
    });

    return {
      toAssign: { unitIds: toAssignUnits, topicIds: toAssignTopics, total: toAssignUnits.length + toAssignTopics.length },
      toUnassign: { unitIds: toUnassignUnits, topicIds: toUnassignTopics, total: toUnassignUnits.length + toUnassignTopics.length }
    };
  }, [selected, initialSelected]);

  const summarizeResults = (results: BulkCurriculumAssignmentResult[]) => {
    const succeeded = results.reduce((s, r) => s + r.succeeded_count, 0);
    const skipped = results.reduce((s, r) => s + r.skipped_count, 0);
    const errors = results.flatMap((r) => r.errors);
    return { succeeded, skipped, errors };
  };

  const handleBulkAssign = async () => {
    const { unitIds, topicIds, total } = toAssign;
    if (total === 0 || !assignSchoolId) return;
    setBulkActionLoading(true);
    try {
      const results: BulkCurriculumAssignmentResult[] = [];

      // Automatically include parent Unit IDs of any topics being assigned,
      // if those parent Units are not already assigned.
      const extraUnitIds: string[] = [];
      topicIds.forEach((tId) => {
        const topicItem = catalog.find((item) => item.id === tId);
        if (topicItem && topicItem.parent_unit_id) {
          const parentUnitId = topicItem.parent_unit_id;
          const isParentAlreadyAssigned = initialSelected.has(parentUnitId);
          const isParentSelectedForAssign = unitIds.includes(parentUnitId) || extraUnitIds.includes(parentUnitId);
          if (!isParentAlreadyAssigned && !isParentSelectedForAssign) {
            extraUnitIds.push(parentUnitId);
          }
        }
      });

      const finalUnitIds = [...unitIds, ...extraUnitIds];

      if (finalUnitIds.length) {
        results.push(await schoolCurriculumService.assignUnits({ school_id: assignSchoolId, unit_ids: finalUnitIds, notes: assignNotes || undefined }));
      }
      if (topicIds.length) {
        results.push(await schoolCurriculumService.assignTopics({ school_id: assignSchoolId, topic_ids: topicIds, notes: assignNotes || undefined }));
      }
      const { succeeded, skipped, errors } = summarizeResults(results);
      toast.success(`Assigned ${succeeded} item(s) to school${skipped ? ` · ${skipped} already assigned` : ''}`);
      if (errors.length) {
        errors.forEach((err) => toast.error(err.reason || 'An item failed to assign'));
      }
      setAssignNotes('');
      await fetchCatalog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign curriculum to school');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnassign = async () => {
    const { unitIds, topicIds, total } = toUnassign;
    if (total === 0 || !assignSchoolId) return;
    const ok = await requestConfirm({
      title: 'Unassign Curriculum',
      message: `Unassign ${total} item(s) from this school? The school's teachers and students will immediately lose visibility into this content.`,
      confirmLabel: 'Unassign',
      variant: 'warning',
    });
    if (!ok) return;
    setBulkActionLoading(true);
    try {
      const results: BulkCurriculumAssignmentResult[] = [];
      if (unitIds.length) {
        results.push(await schoolCurriculumService.unassignUnits({ school_id: assignSchoolId, unit_ids: unitIds, notes: assignNotes || undefined }));
      }
      if (topicIds.length) {
        results.push(await schoolCurriculumService.unassignTopics({ school_id: assignSchoolId, topic_ids: topicIds, notes: assignNotes || undefined }));
      }
      const { succeeded, skipped, errors } = summarizeResults(results);
      toast.success(`Unassigned ${succeeded} item(s) from school${skipped ? ` · ${skipped} were not assigned` : ''}`);
      if (errors.length) {
        errors.forEach((err) => toast.error(err.reason || 'An item failed to unassign'));
      }
      setAssignNotes('');
      await fetchCatalog();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to unassign curriculum from school');
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Curriculum Assignment</h1>
          <p className="text-xs text-gray-500 dark:text-[#94a3b8] font-bold uppercase tracking-widest mt-1">
            Assign Academics Units &amp; Topics to School
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">Search Units &amp; Topics</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748b] w-3.5 h-3.5" />
              <input
                type="text"
                value={catalogSearchInput}
                onChange={(e) => setCatalogSearchInput(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium text-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">School</label>
            <div className="relative">
              <select
                value={assignSchoolId}
                onChange={(e) => setAssignSchoolId(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white"
              >
                <option value="">Select a school…</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">Grade Filter</label>
            <GradeLevelSelect
              value={selectedGradeId}
              onChange={(value) => setSelectedGradeId(value)}
              schoolId={assignSchoolId || undefined}
              valueAs="id"
              placeholder="All Grades"
              className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white"
            />
          </div>

          <div className="min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">Subject Filter</label>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedGradeId}
                className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1.5">Assignment Filter</label>
            <div className="relative">
              <select
                value={catalogAssignedFilter}
                onChange={(e) => setCatalogAssignedFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
                className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white"
              >
                <option value="all">All Items</option>
                <option value="assigned">Assigned Only</option>
                <option value="unassigned">Unassigned Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

        
        </div>

        <div className="space-y-4">
          {/* Top Toolbar / Bulk actions */}
          <div className="bg-slate-50/50 dark:bg-[#283548]/30 border border-slate-200/60 dark:border-[#334155]/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={toggleSelectAllVisible}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-50 dark:hover:bg-[#283548] transition-all cursor-pointer text-xs font-bold shadow-xs active:scale-[0.98]"
              >
                {isAllVisibleSelected ? <CheckSquare className="w-4 h-4 text-indigo-650 dark:text-indigo-400" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span>Select All Visible</span>
              </button>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-black transition-all ${
                selected.size > 0
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-505 dark:text-slate-400'
              }`}>
                <ListChecks className="w-3.5 h-3.5" />
                <span>{selected.size} items selected</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-[#1e293b] dark:hover:bg-[#283548] text-slate-700 dark:text-[#cbd5e1] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand All</span>
              </button>
              <button
                onClick={collapseAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-[#1e293b] dark:hover:bg-[#283548] text-slate-700 dark:text-[#cbd5e1] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Collapse All</span>
              </button>
            </div>
          </div>

          {/* Tree View list */}
          {catalogLoading ? (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-12 text-center shadow-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 mx-auto" />
              <p className="text-xs text-slate-400 mt-2 font-medium">Loading catalog items...</p>
            </div>
          ) : groupedData.length === 0 ? (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-xs">
              <EmptyState icon={<ListChecks className="w-7 h-7" />} title="No units or topics found" subtitle="Try adjusting your filters or search query." />
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-2xl p-5 shadow-xs">
              <div className="max-h-[500px] overflow-y-auto pr-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-[#283548]">
                {groupedData.map(({ unit, topics }) => {
                  const isExpanded = expandedUnits.has(unit.id);
                  const isUnitSelected = selected.has(unit.id);
                  const assignedTopicsCount = topics.filter((t) => t.is_assigned_to_school).length;

                  return (
                    <div
                      key={unit.id}
                      className="bg-slate-50/45 dark:bg-[#283548]/10 border border-slate-200/50 dark:border-[#334155]/40 rounded-xl overflow-hidden hover:bg-slate-50 dark:hover:bg-[#283548]/20 transition-all duration-300"
                    >
                      {/* Unit Accordion Header */}
                      <div className="flex items-center justify-between p-4 hover:bg-slate-100/30 dark:hover:bg-[#283548]/10 transition-colors select-none">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Unit Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleUnitCheckboxChange(unit, topics)}
                            className="flex-shrink-0 active:scale-90 transition-transform duration-105"
                          >
                            {isUnitSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            )}
                          </button>

                          <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(unit.id)}>
                            <div className="text-slate-400 dark:text-slate-500 hover:text-slate-655 dark:hover:text-slate-350">
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                            
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate">
                                {unit.name}
                              </span>
                              
                              {unit.subject_name && (
                                <span className="flex-shrink-0 text-[9.5px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-2.5 py-0.5 rounded">
                                  {unit.subject_name}
                                </span>
                              )}

                              <span className="flex-shrink-0 text-[9.5px] font-bold text-slate-400 bg-slate-100 dark:bg-[#283548]/60 px-2 py-0.5 rounded-full">
                                {topics.length} topics
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                          <StatusPill active={unit.is_active} />
                          {unit.is_assigned_to_school ? (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" /> Assigned ({assignedTopicsCount}/{topics.length})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-105 dark:bg-[#283548] text-slate-400 border border-transparent">
                              Not Assigned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Collapsible panel with Topics */}
                      {isExpanded && (
                        <div className="border-t border-slate-200/50 dark:border-[#334155]/40 bg-white/60 dark:bg-[#1e293b]/40 p-4">
                          <div className="border-l-2 border-slate-200 dark:border-[#283548]/60 pl-5 space-y-3.5 ml-6">
                            {topics.length === 0 ? (
                              <div className="py-3 text-center text-xs text-slate-400">No topics inside this unit</div>
                            ) : (
                              topics.map((topic) => {
                                const isTopicSelected = selected.has(topic.id);
                                return (
                                  <div key={topic.id} className="relative flex items-center justify-between group">
                                    {/* Timeline marker node */}
                                    <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-200 dark:bg-[#283548] border-2 border-white dark:border-[#1e293b] ring-4 ring-transparent group-hover:ring-slate-100 dark:group-hover:ring-slate-800 transition-all duration-300" />
                                    
                                    <div className="flex items-center gap-3 min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => handleTopicCheckboxChange(topic, unit, topics)}
                                        className="flex-shrink-0 active:scale-90 transition-transform duration-100"
                                      >
                                        {isTopicSelected ? (
                                          <CheckSquare className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-355 dark:text-slate-600" />
                                        )}
                                      </button>
                                      <span className="text-xs font-semibold text-slate-600 dark:text-[#cbd5e1] truncate group-hover:text-indigo-655 dark:group-hover:text-indigo-400 transition-colors">
                                        {topic.name}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <StatusPill active={topic.is_active} />
                                      {topic.is_assigned_to_school ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-500/10">
                                          <Check className="w-2.5 h-2.5" /> Assigned
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#283548] text-slate-450">
                                          Not Assigned
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      {assignSchoolId && (toAssign.total > 0 || toUnassign.total > 0) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur border border-indigo-100 dark:border-[#334155] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-[90] animate-in slide-in-from-bottom-8 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                {toAssign.total > 0 && `${toAssign.total} to assign`}
                {toAssign.total > 0 && toUnassign.total > 0 && ' · '}
                {toUnassign.total > 0 && `${toUnassign.total} to unassign`}
              </p>
              <p className="text-xs text-slate-400">Apply assignments for the selected school</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Optional notes for this action..."
              className="flex-1 md:flex-initial px-3 py-2 bg-slate-50 dark:bg-[#283548] border border-slate-200 dark:border-[#334155] rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium text-slate-800 dark:text-white"
            />
            <button
              onClick={handleBulkAssign}
              disabled={bulkActionLoading || toAssign.total === 0}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Assign Selected ({toAssign.total})
            </button>
            <button
              onClick={handleBulkUnassign}
              disabled={bulkActionLoading || toUnassign.total === 0}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Unassign Selected ({toUnassign.total})
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title ?? 'Confirm Action'}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={() => confirmState.resolve?.(true)}
        onCancel={() => confirmState.resolve?.(false)}
      />
    </div>
  );
};

export default CurriculumAssignment;
