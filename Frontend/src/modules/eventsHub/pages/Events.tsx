import StatGridCards from '@/components/StatGrid';
import api from '@/services/api';
import {
  Award,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Phone,
  Plus,
  Printer,
  School,
  Search,
  Send,
  ShieldAlert,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define core interfaces
interface EventItem {
  id: string;
  schoolId?: string;
  title: string;
  description: string;
  category: string;
  date: string;
  deadline: string;
  venue: string;
  maxParticipants: number;
  maxTeams: number;
  waitlistLimit: number;
  autoApproval: boolean;
  registeredCount: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  customFields: string[];
}

interface Registration {
  id: string;
  eventId: string;
  eventName: string;
  studentId: string;
  studentName: string;
  studentGrade: string;
  studentSchool: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  customFieldValues: Record<string, string>;
  attachments: { name: string; type: string }[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted' | 'Cancelled' | 'Completed';
  attendanceStatus: 'Absent' | 'Present' | 'Excused' | 'TBD';
  registrationDate: string;
  eventResult?: string;
  approvalHistory: { user: string; role: string; date: string; action: string }[];
}

interface AuditLog {
  id: string;
  userName: string;
  role: string;
  dateTime: string;
  actionPerformed: string;
}

const Events: React.FC = () => {
  // Authentication & Role
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'participants' | 'audit'>('catalog');

  // Core Stateful Mock DB lists
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState('All');
  const [filterSchool, setFilterSchool] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Selected Item States & Modals
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  // When non-null, the Create/Edit modal is in "edit" mode and targets this event
  // (lets admins correct stored capacity values such as max_participants/waitlist_limit
  // on existing events — e.g. events created before the snake_case payload fix had
  // these persisted as 0, which made them appear permanently "full").
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState<EventItem | null>(null);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  // Parent specific states
  const [selectedChildId, setSelectedChildId] = useState<string>('00000000-0000-0000-0000-000000001250'); // Defaults to John Connor
  const [parentChildren, setParentChildren] = useState<any[]>([
    { id: '', name: '', grade: 'Grade 9', school: '' },
    { id: '', name: '', grade: 'Grade 6', school: '' }
  ]);

  // Admin New Event State
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    category: 'Robotics',
    date: '',
    deadline: '',
    venue: '',
    maxParticipants: 30,
    maxTeams: 10,
    waitlistLimit: 10,
    autoApproval: false,
    schoolId: '',
    customFieldInputs: {
      teamName: true,
      teamMembers: false,
      experienceLevel: true,
      projectTitle: false,
      medicalInfo: false,
      emergencyContact: true
    }
  });

  // Student/Parent Registration Form State
  const [regFormData, setRegFormData] = useState({
    studentId: '',
    studentName: '',
    studentGrade: '',
    studentSchool: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    customFieldValues: {} as Record<string, string>
  });

  // Bulk check selection state
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);

  // --- API response normalisation -------------------------------------------------
  // ROOT CAUSE: the backend's global JSON policy (Program.cs -> AddJsonOptions ->
  // PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower) serialises EVERY
  // controller response — including GET /events and GET /events/registrations —
  // as snake_case (e.g. `max_participants`, `registered_count`, `student_name`,
  // `event_id`, `attendance_status`, `custom_field_values`, `registration_date`,
  // `approval_history`). The `EventItem`/`Registration` interfaces and every render
  // path in this component read camelCase keys (`maxParticipants`, `studentName`,
  // etc.). Previously `registrations` was always an empty array (no registration
  // could ever be saved due to the now-fixed backend bug), so `r.studentName` being
  // `undefined` never executed. Now that registrations save successfully, the array
  // is non-empty and `r.studentName.toLowerCase()` throws
  // "Cannot read properties of undefined (reading 'toLowerCase')", crashing the
  // whole page for every role (the crash site, `filteredRegistrations`, is computed
  // unconditionally before the admin/student/parent branches even run).
  //
  // The correct fix is NOT to change the global backend JSON policy (auth, users,
  // and other modules already depend on snake_case wire format) — it's to normalise
  // each API payload into the camelCase shape this component expects, right at the
  // data-fetching boundary. These mappers also tolerate camelCase/PascalCase input
  // defensively, so they keep working if the backend shape ever changes.
  const mapApiEvent = (raw: any): EventItem => ({
    id: raw.id ?? raw.Id,
    schoolId: raw.school_id ?? raw.schoolId ?? raw.SchoolId ?? '',
    title: raw.title ?? raw.Title ?? '',
    description: raw.description ?? raw.Description ?? '',
    category: raw.category ?? raw.Category ?? '',
    date: raw.date ?? raw.Date ?? '',
    deadline: raw.deadline ?? raw.Deadline ?? '',
    venue: raw.venue ?? raw.Venue ?? '',
    maxParticipants: Number(raw.max_participants ?? raw.maxParticipants ?? raw.MaxParticipants ?? 0),
    maxTeams: Number(raw.max_teams ?? raw.maxTeams ?? raw.MaxTeams ?? 0),
    waitlistLimit: Number(raw.waitlist_limit ?? raw.waitlistLimit ?? raw.WaitlistLimit ?? 0),
    autoApproval: Boolean(raw.auto_approval ?? raw.autoApproval ?? raw.AutoApproval ?? false),
    registeredCount: Number(raw.registered_count ?? raw.registeredCount ?? raw.RegisteredCount ?? 0),
    status: raw.status ?? raw.Status ?? 'Upcoming',
    customFields: raw.custom_fields ?? raw.customFields ?? raw.CustomFields ?? []
  });

  const mapApiRegistration = (raw: any): Registration => ({
    id: raw.id ?? raw.Id,
    eventId: raw.event_id ?? raw.eventId ?? raw.EventId ?? '',
    eventName: raw.event_name ?? raw.eventName ?? raw.EventName ?? 'Unknown Event',
    studentId: raw.student_id ?? raw.studentId ?? raw.StudentId ?? '',
    studentName: raw.student_name ?? raw.studentName ?? raw.StudentName ?? '',
    studentGrade: raw.student_grade ?? raw.studentGrade ?? raw.StudentGrade ?? '',
    studentSchool: raw.student_school ?? raw.studentSchool ?? raw.StudentSchool ?? '',
    parentName: raw.parent_name ?? raw.parentName ?? raw.ParentName ?? '',
    parentPhone: raw.parent_phone ?? raw.parentPhone ?? raw.ParentPhone ?? '',
    parentEmail: raw.parent_email ?? raw.parentEmail ?? raw.ParentEmail ?? '',
    customFieldValues: raw.custom_field_values ?? raw.customFieldValues ?? raw.CustomFieldValues ?? {},
    attachments: raw.attachments ?? raw.Attachments ?? [],
    status: raw.status ?? raw.Status ?? 'Pending',
    attendanceStatus: raw.attendance_status ?? raw.attendanceStatus ?? raw.AttendanceStatus ?? 'TBD',
    registrationDate: raw.registration_date ?? raw.registrationDate ?? raw.RegistrationDate ?? '',
    eventResult: raw.event_result ?? raw.eventResult ?? raw.EventResult ?? undefined,
    approvalHistory: raw.approval_history ?? raw.approvalHistory ?? raw.ApprovalHistory ?? []
  });

  const fetchData = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const userType = user?.utype?.toLowerCase() || '';
      const shouldFetchLogs = ['admin', 'superadmin', 'staff', 'principal'].includes(userType);
      const canSeeAllSchools = ['admin', 'superadmin', 'principal', 'staff', 'teacher'].includes(userType);

      const [eventsRes, regsRes, logsRes, schoolsRes] = await Promise.all([
        api.get('/events').catch(() => { toast.error('Failed to load events.'); return { data: [] }; }),
        api.get('/events/registrations').catch(() => { toast.error('Failed to load registrations.'); return { data: [] }; }),
        shouldFetchLogs
          ? api.get('/events/audit-logs').catch(() => { toast.error('Failed to load audit logs.'); return { data: [] }; })
          : Promise.resolve({ data: [] }),
        canSeeAllSchools
          ? api.get('/schools').catch(() => { toast.error('Failed to load schools.'); return { data: [] }; })
          : Promise.resolve({ data: [] })
      ]);
      setEventsList((eventsRes.data || []).map(mapApiEvent));
      setRegistrations((regsRes.data || []).map(mapApiRegistration));
      setAuditLogs(logsRes.data || []);
      setSchools(schoolsRes?.data || []);
    } catch (err) {
      console.error('Data loading error:', err);
    }
  };

  // Load and seed user + fetch data on mount
  useEffect(() => {
    // Load current user from localStorage (auth token already handled by api interceptor)
    const savedUser = localStorage.getItem('user');
    let loadedUser = null;
    if (savedUser) {
      loadedUser = JSON.parse(savedUser);
      setCurrentUser(loadedUser);
    } else {
      loadedUser = { name: 'LXP Administrator', utype: 'admin', school_id: 'All' };
      setCurrentUser(loadedUser);
    }

    fetchData();

    // Fetch child entities dynamically if parent is authenticated
    if (loadedUser?.utype?.toLowerCase() === 'parent') {
      api.get('/parent/dashboard')
        .then(res => {
          const fetchedChildren = (res.data.children || []).map((c: any) => ({
            id: c.id || c.student_id,
            studentIdDisplay: c.student_id,
            name: c.full_name || `${c.first_name} ${c.last_name}`,
            grade: c.grade_name || 'Grade 9',
            school: c.school_name || 'NubeEra Primary Campus'
          }));
          if (fetchedChildren.length > 0) {
            setParentChildren(fetchedChildren);
            setSelectedChildId(fetchedChildren[0].id);
          }
        })
        .catch(err => {
          console.error('Failed to fetch parent children from dashboard API', err);
        });
    }
  }, []);

  // Local helper to add temporary audit log in current session
  const syncAuditLogs = (action: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      userName: currentUser?.name || 'Anonymous',
      role: currentUser?.utype || 'User',
      dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actionPerformed: action,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };


  // Helper Roles
  const userRole = currentUser?.utype?.toLowerCase() || 'student';
  const isPrincipal = userRole === 'principal';
  const isAdminOrStaff = userRole === 'admin' || userRole === 'superadmin' || userRole === 'staff' || isPrincipal;
  const isStudent = userRole === 'student';
  const isParent = userRole === 'parent';

  const toGuid = (id: string | null | undefined): string => {
    if (!id) return '00000000-0000-0000-0000-000000000000';
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidRegex.test(id)) return id;
    const numericParts = id.match(/\d+/g);
    if (numericParts && numericParts.length > 0) {
      const num = parseInt(numericParts[0], 10);
      const hex = num.toString(16).padStart(12, '0');
      return `00000000-0000-0000-0000-${hex}`;
    }
    return '00000000-0000-0000-0000-000000001092';
  };

  // 1. Capacity Checker and Auto-Approver algorithm on submission
  const executeEventRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRegisterModal) return;

    const event = showRegisterModal;

    const studentGuid = editingRegistration
      ? editingRegistration.studentId
      : isStudent
        ? (currentUser?.student_id || currentUser?.id)
        : isParent
          ? selectedChildId
          : regFormData.studentId;

    const submitData = {
      student_id: toGuid(studentGuid),
      student_name: regFormData.studentName,
      student_grade: regFormData.studentGrade || 'Grade 9',
      student_school: regFormData.studentSchool || 'NubeEra Primary Campus',
      parent_name: regFormData.parentName,
      parent_phone: regFormData.parentPhone,
      parent_email: regFormData.parentEmail,
      custom_field_values: regFormData.customFieldValues
    };

    const request = editingRegistration
      ? api.put(`/events/registrations/${editingRegistration.id}`, submitData)
      : api.post(`/events/${event.id}/register`, submitData);

    request
      .then(res => {
        toast.success(
          editingRegistration
            ? 'Registration updated successfully!'
            : res.data.status === 'Waitlisted'
              ? 'Capacity reached! Registered successfully on the Waitlist.'
              : res.data.status === 'Approved'
                ? 'Registration complete! Automatically approved immediately.'
                : 'Registration submitted successfully! Pending staff approval.'
        );
        fetchData();
        setShowRegisterModal(null);
        setEditingRegistration(null);
      })
      .catch(err => {
        const data = err.response?.data;
        let errMsg = data?.message || data?.error || data?.title;
        if (!errMsg && data?.errors) {
          errMsg = Array.isArray(data.errors)
            ? data.errors.join(' ')
            : Object.values(data.errors).flat().join(' ');
        }
        toast.error(errMsg || 'Failed to submit registration.');
        console.error('Event registration failed:', data || err);
      });
  };

  // Blank slate for the create/edit event form (also used to reset after save/cancel)
  const blankEventFormData = {
    title: '',
    description: '',
    category: 'Robotics',
    date: '',
    deadline: '',
    venue: '',
    maxParticipants: 30,
    maxTeams: 10,
    waitlistLimit: 10,
    autoApproval: false,
    schoolId: '',
    customFieldInputs: {
      teamName: true,
      teamMembers: false,
      experienceLevel: true,
      projectTitle: false,
      medicalInfo: false,
      emergencyContact: true
    }
  };

  // Reverse-maps the persisted custom_fields string labels back into the
  // checkbox booleans the form uses, so editing an existing event shows its
  // current configuration instead of resetting to defaults.
  const customFieldsToInputs = (fields: string[] | undefined | null) => {
    const list = fields || [];
    return {
      teamName: list.includes('Team Name'),
      teamMembers: list.includes('Team Members Count'),
      experienceLevel: list.includes('Experience Level'),
      projectTitle: list.includes('Project Title'),
      medicalInfo: list.includes('Medical Information'),
      emergencyContact: list.includes('Emergency Contact')
    };
  };

  const closeEventModal = () => {
    setShowCreateEventModal(false);
    setEditingEvent(null);
    setNewEventData(blankEventFormData);
  };

  // Opens the same modal pre-populated with an existing event's data so admins
  // can correct stored values (e.g. max_participants/waitlist_limit that were
  // persisted as 0 by events created before the request-payload key-casing fix,
  // which made the event appear permanently "full" at registration time).
  const openEditEventModal = (ev: EventItem) => {
    setEditingEvent(ev);
    setNewEventData({
      title: ev.title,
      description: ev.description,
      category: ev.category,
      date: ev.date ? ev.date.split('T')[0] : '',
      deadline: ev.deadline ? ev.deadline.split('T')[0] : '',
      venue: ev.venue,
      maxParticipants: ev.maxParticipants,
      maxTeams: ev.maxTeams,
      waitlistLimit: ev.waitlistLimit,
      autoApproval: ev.autoApproval,
      schoolId: ev.schoolId || '',
      customFieldInputs: customFieldsToInputs(ev.customFields)
    });
    setShowCreateEventModal(true);
  };

  // 2. Admin Create / Update Event Method (handles both modes — POST to create,
  // PUT /events/{id} to update an existing event when editingEvent is set)
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    const fieldsList: string[] = [];
    if (newEventData.customFieldInputs.teamName) fieldsList.push('Team Name');
    if (newEventData.customFieldInputs.teamMembers) fieldsList.push('Team Members Count');
    if (newEventData.customFieldInputs.experienceLevel) fieldsList.push('Experience Level');
    if (newEventData.customFieldInputs.projectTitle) fieldsList.push('Project Title');
    if (newEventData.customFieldInputs.medicalInfo) fieldsList.push('Medical Information');
    if (newEventData.customFieldInputs.emergencyContact) fieldsList.push('Emergency Contact');

    const eventPayload = {
      title: newEventData.title,
      description: newEventData.description,
      category: newEventData.category,
      date: newEventData.date || new Date().toISOString().split('T')[0],
      deadline: newEventData.deadline || new Date().toISOString().split('T')[0],
      venue: newEventData.venue || 'Main Campus Hall',
      max_participants: Number(newEventData.maxParticipants),
      max_teams: Number(newEventData.maxTeams),
      waitlist_limit: Number(newEventData.waitlistLimit),
      auto_approval: newEventData.autoApproval,
      custom_fields: fieldsList,
      school_id: newEventData.schoolId || null
    };

    const isEditing = !!editingEvent;
    const request = isEditing
      ? api.put(`/events/${editingEvent!.id}`, eventPayload)
      : api.post('/events', eventPayload);

    request
      .then(() => {
        toast.success(isEditing ? 'Event updated successfully!' : 'New event created successfully!');
        fetchData();
        closeEventModal();
      })
      .catch(err => {
        const data = err.response?.data;
        let errMsg = data?.message || data?.error || data?.title;
        if (!errMsg && data?.errors) {
          errMsg = Array.isArray(data.errors)
            ? data.errors.join(' ')
            : Object.values(data.errors).flat().join(' ');
        }
        toast.error(errMsg || (isEditing ? 'Failed to update event.' : 'Failed to create event.'));
        console.error('Event save failed:', data || err);
      });
  };

  // 3. Single Action Approval triggers
  const handleRegStatusChange = (reg: Registration, nextStatus: Registration['status']) => {
    api.put(`/events/registrations/${reg.id}/status`, { status: nextStatus })
      .then(() => {
        toast.success(`Registration status updated to ${nextStatus}`);
        fetchData();
        if (selectedReg?.id === reg.id) {
          setSelectedReg(prev => prev ? { ...prev, status: nextStatus } : null);
        }
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to update registration status.');
      });
  };

  const handleAttendanceChange = (reg: Registration, nextAtt: Registration['attendanceStatus']) => {
    api.put(`/events/registrations/${reg.id}/attendance`, { attendance_status: nextAtt })
      .then(() => {
        toast.success(`Attendance updated to ${nextAtt}`);
        fetchData();
        if (selectedReg?.id === reg.id) {
          setSelectedReg(prev => prev ? { ...prev, attendanceStatus: nextAtt } : null);
        }
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to update attendance.');
      });
  };

  const handleResultSave = (regId: string, resultText: string) => {
    api.put(`/events/registrations/${regId}/result`, { result: resultText })
      .then(() => {
        toast.success('Participant result recorded successfully!');
        fetchData();
        if (selectedReg?.id === regId) {
          setSelectedReg(prev => prev ? { ...prev, eventResult: resultText, status: resultText ? 'Completed' : prev.status } : null);
        }
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to save event result.');
      });
  };

  // 4. Bulk Action implementations
  const handleBulkStatusChange = async (nextStatus: Registration['status']) => {
    if (selectedRegIds.length === 0) {
      toast.error('No items selected!');
      return;
    }
    try {
      await Promise.all(
        selectedRegIds.map(id => api.put(`/events/registrations/${id}/status`, { status: nextStatus }))
      );
      toast.success(`Successfully bulk updated ${selectedRegIds.length} items to ${nextStatus}!`);
      setSelectedRegIds([]);
      fetchData();
    } catch (err) {
      toast.error('Failed to complete some status updates.');
    }
  };

  const handleBulkAttendanceChange = async (nextAtt: Registration['attendanceStatus']) => {
    if (selectedRegIds.length === 0) {
      toast.error('No items selected!');
      return;
    }
    try {
      await Promise.all(
        selectedRegIds.map(id => api.put(`/events/registrations/${id}/attendance`, { attendance_status: nextAtt }))
      );
      toast.success(`Successfully marked attendance as ${nextAtt} for ${selectedRegIds.length} items!`);
      setSelectedRegIds([]);
      fetchData();
    } catch (err) {
      toast.error('Failed to update attendance status.');
    }
  };

  const handleStudentCancel = (reg: Registration) => {
    api.post(`/events/registrations/${reg.id}/cancel`, {})
      .then(() => {
        toast.success('Registration cancelled successfully.');
        fetchData();
      })
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to cancel registration.');
      });
  };

  // 5. Clean Client-Side Export Actions
  const handleExportCSV = () => {
    let headers = 'Registration Number,Student Name,Parent Name,School,Grade/Class,Event Name,Registration Date,Status,Attendance Status,Event Result\n';
    let rows = filteredRegistrations.map(r => {
      return `"${r.id}","${r.studentName}","${r.parentName}","${r.studentSchool}","${r.studentGrade}","${r.eventName}","${r.registrationDate}","${r.status}","${r.attendanceStatus}","${r.eventResult || ''}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LMS_Participant_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    syncAuditLogs('Exported Participant List to CSV format');
    toast.success('Participant report CSV downloaded successfully!');
  };

  // Printable view trigger
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Event Registration Report</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #334155; }
            h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
            p { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background: #f8fafc; text-align: left; padding: 10px; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body onload="window.print();">
          <h1>LXP Active Participants Register</h1>
          <p>Consolidated Event Registrations as of ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Reg No</th>
                <th>Student Name</th>
                <th>Grade</th>
                <th>School</th>
                <th>Event Name</th>
                <th>Reg Date</th>
                <th>Status</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRegistrations.map(r => `
                <tr>
                  <td>${r.id}</td>
                  <td><b>${r.studentName}</b></td>
                  <td>${r.studentGrade}</td>
                  <td>${r.studentSchool}</td>
                  <td>${r.eventName}</td>
                  <td>${r.registrationDate}</td>
                  <td>${r.status}</td>
                  <td>${r.attendanceStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    syncAuditLogs('Printed Event Registration Report');
  };

  // Grid/Filters matching calculations
  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch =
      (r.studentName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.parentName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.studentSchool ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEvent = filterEvent === 'All' || r.eventId === filterEvent;
    const matchesSchool = filterSchool === 'All' || r.studentSchool.includes(filterSchool);
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;

    return matchesSearch && matchesEvent && matchesSchool && matchesStatus;
  });

  useEffect(() => {
    if (eventsList.length > 0 && !selectedEventId) {
      setSelectedEventId(eventsList[0].id);
    }
  }, [eventsList, selectedEventId]);

  useEffect(() => {
    if (filteredRegistrations.length > 0) {
      if (!selectedReg || !filteredRegistrations.some(r => r.id === selectedReg.id)) {
        setSelectedReg(filteredRegistrations[0]);
      }
    } else {
      setSelectedReg(null);
    }
  }, [filteredRegistrations, selectedReg]);

  // Calculate Metrics Widgets Data
  const totalRegCount = registrations.length;
  const pendingRegCount = registrations.filter(r => r.status === 'Pending').length;
  const approvedRegCount = registrations.filter(r => r.status === 'Approved' || r.status === 'Completed').length;
  const waitlistRegCount = registrations.filter(r => r.status === 'Waitlisted').length;
  const presentCount = registrations.filter(r => r.attendanceStatus === 'Present').length;
  const totalMarkedAttendance = registrations.filter(r => r.attendanceStatus === 'Present' || r.attendanceStatus === 'Absent').length;
  const attendanceRate = totalMarkedAttendance > 0 ? Math.round((presentCount / totalMarkedAttendance) * 100) : 0;

  // Student specific registrations filter
  const studentRegs = registrations.filter(r => {
    const currentStudentIdGuid = toGuid(currentUser?.student_id || currentUser?.id);
    return toGuid(r.studentId) === currentStudentIdGuid;
  });

  // Parent specific registrations filter (for selected child)
  const parentRegs = registrations.filter(r => toGuid(r.studentId) === toGuid(selectedChildId));

  // Quick helper to fill student details in form when modal triggers
  const openSelfRegisterForm = async (event: EventItem) => {
    const fallbackName = currentUser?.full_name
      || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim();

    // Pre-fill with what we already know from the session...
    const baseData = {
      studentId: currentUser?.student_id || currentUser?.id || '',
      studentName: fallbackName,
      studentGrade: '',
      studentSchool: currentUser?.school_name || '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      customFieldValues: {} as Record<string, string>
    };
    setRegFormData(baseData);
    setShowRegisterModal(event);

    // ...then refine with the student's actual profile/grade from their dashboard
    // and profile details (for parent/guardian contact info).
    try {
      const [dashRes, profileRes] = await Promise.all([
        api.get('/dashboard/student').catch(() => ({ data: {} })),
        api.get('/users/profile').catch(() => ({ data: {} }))
      ]);
      const d = dashRes.data || {};
      const p = profileRes.data || {};
      const sd = p.student_details || {};
      setRegFormData(prev => ({
        ...prev,
        studentId: sd.student_id || d.student_id || prev.studentId,
        studentName: p.full_name || d.student_name || prev.studentName,
        studentGrade: d.grade_name || prev.studentGrade,
        studentSchool: p.school_name || d.school_name || prev.studentSchool,
        parentName: sd.parent_guardian_name || prev.parentName,
        parentPhone: sd.parent_guardian_phone || prev.parentPhone,
        parentEmail: sd.parent_guardian_email || prev.parentEmail
      }));
    } catch (err) {
      console.error('Failed to fetch student profile for registration autofill', err);
    }
  };

  const openEditRegisterForm = (event: EventItem, reg: Registration) => {
    setEditingRegistration(reg);
    setRegFormData({
      studentId: reg.studentId,
      studentName: reg.studentName,
      studentGrade: reg.studentGrade,
      studentSchool: reg.studentSchool,
      parentName: reg.parentName,
      parentPhone: reg.parentPhone,
      parentEmail: reg.parentEmail,
      customFieldValues: { ...reg.customFieldValues }
    });
    setShowRegisterModal(event);
  };

  const openParentRegisterForm = (event: EventItem) => {
    const selectedChild = parentChildren.find(c => c.id === selectedChildId);
    const parentFullName = currentUser?.full_name
      || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim();

    setRegFormData({
      studentId: selectedChild?.studentIdDisplay || selectedChild?.id || '',
      studentName: selectedChild?.name || '',
      studentGrade: selectedChild?.grade || '',
      studentSchool: selectedChild?.school || '',
      parentName: parentFullName,
      parentPhone: currentUser?.phone || '',
      parentEmail: currentUser?.email || '',
      customFieldValues: {}
    });
    setShowRegisterModal(event);
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="text-left">
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5">
            School Events
          </span>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">School Events</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            {isAdminOrStaff
              ? 'Track event sign-ups, schedule school activities, and view registrations.'
              : isStudent
                ? 'Sign up for upcoming events, upload files, and check your approval status!'
                : 'Track event sign-ups for your children and view calendars.'}
          </p>
        </div>

        {/* Tab Controls for Administrators */}
        {isAdminOrStaff && (
          <div className="flex bg-slate-100/80 p-1 border-slate-200/50 rounded-xl space-x-1 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'catalog'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Events List
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'participants'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Participant List
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'audit'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Activity History
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ADMINISTRATOR & STAFF SYSTEM VIEW                                      */}
      {/* ========================================================================= */}
      {isAdminOrStaff && (
        <>
          {/* Widgets Stats Dashboard Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatGridCards stats={[
              { title: "Total Sign-ups", value: totalRegCount, subtitle: "Active registrations", color: "indigo", icon: <FileText className="w-5 h-5" /> },
              { title: "Pending Approvals", value: pendingRegCount, subtitle: "Needs staff review", color: "amber", icon: <ShieldAlert className="w-5 h-5" /> },
              { title: "Approved Sign-ups", value: approvedRegCount, subtitle: "Confirmed spots", color: "violet", icon: <Check className="w-5 h-5" /> },
              { title: "Attendance Rate", value: `${attendanceRate}%`, subtitle: "Of total marked", color: "rose", icon: <Award className="w-5 h-5" /> }
            ]} />
          </div>

          {/* TAB 1: CATALOG OVERVIEW */}
          {activeTab === 'catalog' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
              {/* Left Panel: Events List (col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">Active Events</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure capacities & custom fields</p>
                  </div>
                  {!isPrincipal && (
                    <button
                      onClick={() => setShowCreateEventModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold uppercase tracking-widest text-[9.5px] transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create
                    </button>
                  )}
                </div>

                {/* Event Cards Vertical List */}
                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                  {eventsList.map(e => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEventId(e.id)}
                      className={`rounded-2xl p-4 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-305 relative group ${selectedEventId === e.id
                        ? 'bg-gradient-to-r from-primary/10 to-indigo-500/5 dark:from-primary/20 dark:to-indigo-500/10 border-primary ring-1 ring-blue-500/20'
                        : 'bg-white dark:bg-[#1e293b] border-slate-150 dark:border-[#334155]'
                        }`}
                    >
                      <div className="space-y-2">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${selectedEventId === e.id ? 'bg-blue-100 text-blue-750' : 'bg-slate-105 text-slate-605'
                            }`}>
                            {e.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-slate-400 font-bold">
                              ID: {e.id}
                            </span>
                            {selectedEventId === e.id && (
                              <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300" />
                            )}
                          </div>
                        </div>

                        {/* Title & Desc */}
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800 leading-snug tracking-tight">
                            {e.title}
                          </h4>
                          <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed line-clamp-2">
                            {e.description}
                          </p>
                        </div>

                        {/* Quick details */}
                        <div className="pt-2 border-t border-slate-100/50 flex justify-between text-[10.5px] text-slate-500 font-semibold">
                          <span>Date: {e.date}</span>
                          <span>Registered: {e.registeredCount}/{e.maxParticipants}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel: Event Detailed Info & Config (col-span-7) */}
              <div className="lg:col-span-7">
                {selectedEventId && eventsList.find(e => e.id === selectedEventId) ? (() => {
                  const e = eventsList.find(e => e.id === selectedEventId)!;
                  return (
                    <div className="bg-white border-slate-150 rounded-2xl shadow-xs p-6 space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-[9.5px] font-black text-blue-600 bg-blue-50 border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {e.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-extrabold">EVENT ID: {e.id}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-850 tracking-tight leading-tight">{e.title}</h3>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</h4>
                        <p className="text-xs text-slate-650 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border-slate-100">
                          {e.description}
                        </p>
                      </div>

                      {/* Event Meta Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600 bg-slate-50/50 p-4 rounded-xl border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Event Date</span>
                            <span className="text-slate-800 font-bold">{e.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-rose-500 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Reg Deadline</span>
                            <span className="text-slate-855 font-bold">{e.deadline}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                          <School className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Venue / Location</span>
                            <span className="text-slate-805 font-bold">{e.venue}</span>
                          </div>
                        </div>
                      </div>

                      {/* Capacities */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-50 border-slate-150 p-3 rounded-xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Capacity</span>
                          <span className="text-base font-black text-slate-805 block">{e.registeredCount} / {e.maxParticipants}</span>
                          <span className="text-[8px] font-semibold text-slate-400">Individual Slots</span>
                        </div>
                        <div className="bg-slate-50 border-slate-150 p-3 rounded-xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Max Teams</span>
                          <span className="text-base font-black text-slate-800 block">{e.maxTeams}</span>
                          <span className="text-[8px] font-semibold text-slate-400">Team Formations</span>
                        </div>
                        <div className="bg-slate-50 border-slate-150 p-3 rounded-xl">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Workflow</span>
                          <span className={`text-[10px] font-extrabold uppercase block py-0.5 ${e.autoApproval ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {e.autoApproval ? '⚡ Auto' : '🤝 Manual'}
                          </span>
                          <span className="text-[8px] font-semibold text-slate-400">Staff Approval</span>
                        </div>
                      </div>

                      {/* Custom Fields */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Custom Fields</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {e.customFields && e.customFields.length > 0 ? (
                            e.customFields.map((cf, idx) => (
                              <span key={idx} className="text-[9px] font-bold text-slate-705 bg-slate-105 border-slate-205 px-2.5 py-1 rounded-md">
                                {cf}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-450 italic">No custom fields configured for this event.</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setFilterEvent(e.id);
                              setActiveTab('participants');
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[9.5px] transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            Inspect Registrants <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {!isPrincipal && (
                            <button
                              onClick={(ev) => { ev.stopPropagation(); openEditEventModal(e); }}
                              title="Edit event details & capacities"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[9.5px] transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                        </div>

                        {!isPrincipal && (
                          <button
                            onClick={() => setShowRegisterModal(e)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[9.5px] transition-all shadow-sm shrink-0"
                          >
                            Register Student
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="bg-slate-50 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    Please select an event to view configuration details.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PARTICIPANTS DIRECTORY TAB */}
          {activeTab === 'participants' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
              {/* Left Panel: Active Registrants (col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Active Registrants</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Execute batch actions, inspect profiles, and update scores</p>
                </div>

                {/* Filters Panel */}
                <div className="p-4 bg-slate-50 border-slate-150 rounded-2xl space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by student, reg..."
                      className="w-full pl-9 pr-4 py-2 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-[11px] shadow-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Event Select */}
                    <div className="relative">
                      <select
                        value={filterEvent}
                        onChange={e => setFilterEvent(e.target.value)}
                        className="w-full pl-2 pr-6 py-2 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-[10px] cursor-pointer appearance-none"
                      >
                        <option value="All">All Events</option>
                        {eventsList.map(e => (
                          <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Campus Select */}
                    <div className="relative">
                      <select
                        value={filterSchool}
                        onChange={e => setFilterSchool(e.target.value)}
                        className="w-full pl-2 pr-6 py-2 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-[10px] cursor-pointer appearance-none"
                      >
                        <option value="All">All Campuses</option>
                        <option value="Primary">Primary Campus</option>
                        <option value="Secondary">Secondary Campus</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Status Filter */}
                    <div className="relative">
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full pl-2 pr-6 py-2 bg-white border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-[10px] cursor-pointer appearance-none"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Waitlisted">Waitlisted</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Exports */}
                    <div className="flex gap-1">
                      <button
                        onClick={handleExportCSV}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100 px-2 py-2 rounded-xl font-bold uppercase tracking-wider text-[8.5px] transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                      </button>
                      <button
                        onClick={handlePrintReport}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-100 px-2 py-2 rounded-xl font-bold transition-all flex items-center justify-center shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bulk Actions Panel */}
                {selectedRegIds.length > 0 && !isPrincipal && (
                  <div className="p-3 bg-blue-50/70 border-blue-150 rounded-xl space-y-2 text-left">
                    <span className="text-[9.5px] font-black text-blue-800 uppercase tracking-wider block">
                      Bulk Actions ({selectedRegIds.length} Selected)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleBulkStatusChange('Approved')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('Rejected')}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('Waitlisted')}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider"
                      >
                        Waitlist
                      </button>
                      <button
                        onClick={() => handleBulkAttendanceChange('Present')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider"
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleBulkAttendanceChange('Absent')}
                        className="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider"
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => {
                          toast.success(`Notifications broadcast successfully to ${selectedRegIds.length} students!`);
                          syncAuditLogs(`Broadcast bulk event reminder to ${selectedRegIds.length} registrants.`);
                          setSelectedRegIds([]);
                        }}
                        className="bg-white border-slate-200 text-slate-700 px-2 py-1 rounded text-[8.5px] font-black uppercase tracking-wider hover:bg-slate-50 flex items-center gap-0.5"
                      >
                        <Send className="w-2.5 h-2.5" /> Remind
                      </button>
                    </div>
                  </div>
                )}

                {/* Registrants Vertical List */}
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {filteredRegistrations.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                      No matching registered participants found.
                    </div>
                  ) : (
                    filteredRegistrations.map(r => {
                      const statusColors: Record<string, string> = {
                        Pending: 'text-amber-700 bg-amber-50 border-amber-100',
                        Approved: 'text-emerald-700 bg-emerald-50 border-emerald-100',
                        Waitlisted: 'text-sky-700 bg-sky-50 border-sky-100',
                        Rejected: 'text-rose-700 bg-rose-50 border-rose-100',
                        Cancelled: 'text-slate-500 bg-slate-55 border-slate-100',
                        Completed: 'text-indigo-750 bg-indigo-50 border-indigo-100'
                      };

                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReg(r)}
                          className={`rounded-2xl p-4 cursor-pointer flex items-start gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md relative group ${selectedReg?.id === r.id
                            ? 'bg-gradient-to-r from-primary/10 to-indigo-500/5 dark:from-primary/20 dark:to-indigo-500/10 border-primary ring-1 ring-blue-500/20'
                            : 'bg-white dark:bg-[#1e293b] border-slate-150 dark:border-[#334155]'
                            }`}
                        >
                          {!isPrincipal && (
                            <input
                              type="checkbox"
                              checked={selectedRegIds.includes(r.id)}
                              onClick={(e) => e.stopPropagation()} // Prevent selection row change
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegIds([...selectedRegIds, r.id]);
                                } else {
                                  setSelectedRegIds(selectedRegIds.filter(id => id !== r.id));
                                }
                              }}
                              className="rounded-[4px] border-slate-350 focus:ring-blue-500 cursor-pointer w-4 h-4 mt-0.5 font-bold"
                            />
                          )}

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-slate-808 dark:text-white text-[11.5px]">{r.studentName}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8.5px] text-slate-400 font-bold">{r.id}</span>
                                {selectedReg?.id === r.id && (
                                  <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-in fade-in slide-in-from-left-2 duration-300" />
                                )}
                              </div>
                            </div>

                            <div className="text-[10px] font-semibold text-slate-500 space-y-0.5 text-left">
                              <p className="font-bold text-slate-700 truncate">Event: {r.eventName}</p>
                              <p>{r.studentGrade} &bull; {r.studentSchool}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-100/50 flex justify-between items-center">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wide inline-block ${statusColors[r.status] || ''}`}>
                                {r.status}
                              </span>

                              <span className="text-[9px] font-bold text-slate-400">{r.registrationDate.split(' ')[0]}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel: Dossier Details & Actions (col-span-7) */}
              <div className="lg:col-span-7">
                {selectedReg ? (
                  <div className="bg-white border-slate-150 rounded-2xl shadow-xs p-6 space-y-6">
                    <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shadow-inner text-sm">
                          {selectedReg.studentName[0]}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 tracking-tight">{selectedReg.studentName}</h3>
                          <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">Registration Number: {selectedReg.id}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-extrabold">CAMPUS: {selectedReg.studentSchool}</span>
                    </div>

                    {/* Responses */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Event Entry & Registration Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                        <div>
                          <span className="text-[9.5px] font-black text-slate-400 uppercase block mb-0.5">Event Targeted:</span>
                          <span className="text-slate-800 font-extrabold">{selectedReg.eventName}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black text-slate-400 uppercase block mb-0.5">Registration Date:</span>
                          <span>{selectedReg.registrationDate}</span>
                        </div>

                        {Object.entries(selectedReg.customFieldValues).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-[9.5px] font-black text-slate-400 uppercase block mb-0.5">{key}:</span>
                            <span className="text-slate-800 font-bold">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parent Info & Contacts */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Parent & Emergency Contact Profile</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                        <div>
                          <span className="text-[9.5px] font-black text-slate-400 uppercase block mb-0.5">Parent Name:</span>
                          <span className="text-slate-850 font-extrabold">{selectedReg.parentName}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-black text-slate-400 uppercase block mb-0.5">Emergency Contact:</span>
                          <span className="text-slate-800 font-extrabold">{selectedReg.parentPhone}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9.5px] font-black text-slate-400 uppercase block mb-0.5">Parent Email:</span>
                          <span>{selectedReg.parentEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Attachments Section */}
                    {selectedReg.attachments && selectedReg.attachments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Uploaded Portfolios & Consent Artifacts</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-600">
                          {selectedReg.attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 border-slate-150 rounded-xl hover:bg-slate-100/70 transition-colors">
                              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[11px] text-slate-850 font-extrabold truncate" title={file.name}>{file.name}</p>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{file.type}</span>
                              </div>
                              <button
                                onClick={() => toast.success(`Viewing ${file.name}...`)}
                                className="text-[9px] text-blue-600 hover:text-blue-700 font-black uppercase tracking-wider shrink-0"
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow Operations Action Drawer */}
                    <div className="p-4 bg-slate-50 border-slate-205 rounded-xl space-y-4 text-left">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] font-black text-slate-700 block">
                            {isPrincipal ? 'Registration Information' : 'Registration Workflow Action Center'}
                          </span>
                          <p className="text-[9px] text-slate-400 font-semibold">
                            {isPrincipal ? 'View status, attendance, and scores' : 'Transition status, mark attendance, and award scores'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-black text-slate-455 uppercase block">Status:</span>
                          <span className="px-2 py-0.5 bg-white border-slate-200 rounded font-black text-[9px] text-slate-705 uppercase tracking-wider">
                            {selectedReg.status}
                          </span>
                        </div>
                      </div>

                      {/* Approval status transitions */}
                      {!isPrincipal && (
                        <div className="space-y-2">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Update Status:</span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleRegStatusChange(selectedReg, 'Approved')}
                              disabled={selectedReg.status === 'Approved'}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRegStatusChange(selectedReg, 'Rejected')}
                              disabled={selectedReg.status === 'Rejected'}
                              className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleRegStatusChange(selectedReg, 'Waitlisted')}
                              disabled={selectedReg.status === 'Waitlisted'}
                              className="bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-40 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              Waitlist
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Attendance markers */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                        <div className="space-y-1.5">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Mark Attendance:</span>
                          <div className="relative">
                            <select
                              value={selectedReg.attendanceStatus}
                              disabled={isPrincipal}
                              onChange={(e) => handleAttendanceChange(selectedReg, e.target.value as any)}
                              className="w-full pl-2 pr-6 py-1.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-[10px] cursor-pointer appearance-none disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                              <option value="TBD">TBD</option>
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Excused">Excused</option>
                            </select>
                            {!isPrincipal && <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Event Award / Certificate:</span>
                          <input
                            type="text"
                            placeholder="e.g. 1st Place / 92 points"
                            defaultValue={selectedReg.eventResult || ''}
                            disabled={isPrincipal}
                            onBlur={(e) => handleResultSave(selectedReg.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleResultSave(selectedReg.id, (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-[10px] disabled:opacity-75 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logs approval history timeline */}
                    <div className="space-y-3 text-left">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Dossier Event Logs</h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {selectedReg.approvalHistory && selectedReg.approvalHistory.length > 0 ? (
                          selectedReg.approvalHistory.map((hist, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50 border-slate-150 rounded-xl text-[10px] font-semibold text-slate-600 text-left flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0"></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-800 font-extrabold">{hist.action}</p>
                                <span className="text-slate-400 font-bold uppercase text-[8.5px]">{hist.user} ({hist.role}) &bull; {hist.date}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No historical actions logged on this registration dossier.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    Please select a registrant to view their profile dossier.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL TAB */}
          {activeTab === 'audit' && (
            <div className="bg-white border-slate-150 rounded-2xl shadow-xs p-6 space-y-4 text-left">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Security Audit Log & Activity Trail</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unalterable history logs of administrative modifications and workflows</p>
              </div>

              <div className="border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors text-[11.5px] font-semibold text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border-slate-200/50 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-extrabold text-slate-800">{log.userName}</span>
                        <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.2 rounded-sm">{log.role}</span>
                        <span className="text-[9.5px] text-slate-400 font-medium ml-auto">{log.dateTime}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{log.actionPerformed}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. STUDENT PERSONAL VIEW                                                  */}
      {/* ========================================================================= */}
      {isStudent && (
        <div className="space-y-8">
          {/* Active Enrollment Stats banner */}
          <div
            style={{ backgroundColor: 'color-mix(in oklab, var(--primary) 90%, transparent)' }}
            className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-md text-left"
          >
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="text-[9.5px] font-black text-blue-100 uppercase tracking-widest">NubeEra Campus STEM Contests</span>
              <h2 className="text-2.5xl   text-white tracking-tight">Active Event Registrations Locker</h2>
              <p className="text-blue-50 text-xs font-semibold leading-relaxed">
                Take part in state robotics competitions, national data sprints, or science arenas. Develop teamwork, solve core criteria, earn recognition badges, and build your digital portfolios!
              </p>
            </div>
          </div>

          {/* Catalog Row */}
          <div className="space-y-4 text-left">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Eligible Campus Competitions</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Explore contests & register today</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsList.map(e => {
                // Find if student has already registered
                const registered = studentRegs.find(r => r.eventId === e.id);

                return (
                  <div key={e.id} className="bg-white border-slate-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {e.category}
                        </span>
                        {registered ? (
                          <span className="text-[8.5px] font-black text-blue-700 bg-blue-100 border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Registered
                          </span>
                        ) : e.registeredCount >= e.maxParticipants ? (
                          <span className="text-[8.5px] font-black text-sky-700 bg-sky-50 border-sky-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Waitlist Only
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-black text-slate-500 bg-slate-50 border-slate-150 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Open
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-base font-black text-slate-800 leading-snug tracking-tight group-hover:text-blue-700 transition-colors">
                          {e.title}
                        </h4>
                        <p className="text-[11.5px] text-slate-400 font-medium leading-relaxed line-clamp-3">
                          {e.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-50 space-y-2 text-[11px] font-semibold text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span><b>Deadline:</b> {e.deadline}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <School className="w-3.5 h-3.5 text-slate-400" />
                          <span><b>Venue:</b> {e.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {e.maxParticipants - e.registeredCount > 0
                          ? `${e.maxParticipants - e.registeredCount} spots remaining`
                          : 'Waitlist active'}
                      </span>

                      {registered ? (
                        registered.status !== 'Cancelled' && registered.status !== 'Completed' && registered.status !== 'Rejected' ? (
                          <button
                            onClick={() => openEditRegisterForm(e, registered)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Enrolled
                            </span>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => openSelfRegisterForm(e)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all"
                        >
                          Register Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Registrations Tracking Section */}
          <div className="bg-white border-slate-150 rounded-2xl p-6 shadow-xs text-left space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">My Active Registrations Portfolio</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monitor status and download achievements</p>
            </div>

            {studentRegs.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                You are not registered in any event yet.
              </div>
            ) : (
              <div className="border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {studentRegs.map(r => {
                  const statusColors: Record<string, string> = {
                    Pending: 'text-amber-700 bg-amber-50',
                    Approved: 'text-emerald-700 bg-emerald-50',
                    Waitlisted: 'text-sky-700 bg-sky-50',
                    Rejected: 'text-rose-700 bg-rose-50',
                    Cancelled: 'text-slate-500 bg-slate-100',
                    Completed: 'text-indigo-750 bg-indigo-50'
                  };

                  return (
                    <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11.5px] font-semibold text-slate-600">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">{r.id}</span>
                          <h4 className="text-sm font-black text-slate-800 tracking-tight">{r.eventName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide ${statusColors[r.status]}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Registered on {r.registrationDate}</p>
                      </div>

                      {/* Right Options */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {r.eventResult && (
                          <div className="flex items-center gap-1 text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-md border-indigo-100 text-[10px] uppercase tracking-wider">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>{r.eventResult}</span>
                          </div>
                        )}

                        {r.status === 'Completed' && (
                          <button
                            onClick={() => {
                              toast.success('Certificate generated successfully! Downloading...');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Certificate
                          </button>
                        )}

                        {r.status === 'Approved' && (
                          <button
                            onClick={() => {
                              toast.success('Participation Confirmation Letter generated! Downloading...');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-xs"
                          >
                            <FileText className="w-3 h-3" /> Confirmation
                          </button>
                        )}

                        {r.status !== 'Cancelled' && r.status !== 'Completed' && r.status !== 'Rejected' && (
                          <button
                            onClick={() => handleStudentCancel(r)}
                            className="text-rose-600 hover:text-rose-700 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-1.5 transition-all"
                          >
                            Cancel Seat
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PARENT MODULE VIEW                                                     */}
      {/* ========================================================================= */}
      {isParent && (
        <div className="space-y-8 text-left">
          {/* Child Selector Row */}
          <div className="bg-white border-slate-150 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">Linked Student Dashboard Portfolio</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select linked child account to enroll or review portfolios</p>
            </div>

            <div className="relative w-full sm:w-64">
              <select
                value={selectedChildId}
                onChange={e => setSelectedChildId(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs cursor-pointer appearance-none"
              >
                {parentChildren.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Child Active Registrations Grid */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Registrations & Awards – {parentChildren.find(c => c.id === selectedChildId)?.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active contest participation tracking & achievements</p>
            </div>

            {parentRegs.length === 0 ? (
              <div className="bg-white border-slate-100 rounded-2xl p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                This student has not submitted any active event registrations.
              </div>
            ) : (
              <div className="bg-white border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                {parentRegs.map(r => {
                  const statusColors: Record<string, string> = {
                    Pending: 'text-amber-700 bg-amber-50',
                    Approved: 'text-emerald-700 bg-emerald-50',
                    Waitlisted: 'text-sky-700 bg-sky-50',
                    Rejected: 'text-rose-700 bg-rose-50',
                    Cancelled: 'text-slate-500 bg-slate-100',
                    Completed: 'text-indigo-750 bg-indigo-50'
                  };

                  return (
                    <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11.5px] font-semibold text-slate-600">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">{r.id}</span>
                          <h4 className="text-sm font-black text-slate-800 tracking-tight">{r.eventName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide ${statusColors[r.status]}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Registered on {r.registrationDate}</p>
                      </div>

                      {/* Right outcomes / downloads */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {r.eventResult && (
                          <div className="flex items-center gap-1 text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-md border-indigo-100 text-[10px] uppercase tracking-wider">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>{r.eventResult}</span>
                          </div>
                        )}

                        {r.status === 'Completed' && (
                          <button
                            onClick={() => {
                              toast.success('Certificate generated successfully! Downloading...');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Certificate
                          </button>
                        )}

                        {r.status === 'Approved' && (
                          <button
                            onClick={() => {
                              toast.success('Consent & entry details downloaded successfully!');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-xs"
                          >
                            <FileText className="w-3 h-3" /> Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Register Child Catalog Row */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Register Selected Child for Contests</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select an upcoming contest to register</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsList.map(e => {
                const registered = parentRegs.find(r => r.eventId === e.id);

                return (
                  <div key={e.id} className="bg-white border-slate-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {e.category}
                        </span>
                        {registered ? (
                          <span className="text-[8.5px] font-black text-blue-700 bg-blue-100 border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Registered
                          </span>
                        ) : e.registeredCount >= e.maxParticipants ? (
                          <span className="text-[8.5px] font-black text-sky-700 bg-sky-50 border-sky-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Waitlist Only
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-black text-slate-500 bg-slate-50 border-slate-150 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Open
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-base font-black text-slate-800 leading-snug tracking-tight group-hover:text-blue-700 transition-colors">
                          {e.title}
                        </h4>
                        <p className="text-[11.5px] text-slate-400 font-medium leading-relaxed line-clamp-3">
                          {e.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-50 space-y-2 text-[11px] font-semibold text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span><b>Deadline:</b> {e.deadline}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <School className="w-3.5 h-3.5 text-slate-400" />
                          <span><b>Venue:</b> {e.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {e.maxParticipants - e.registeredCount > 0
                          ? `${e.maxParticipants - e.registeredCount} spots remaining`
                          : 'Waitlist active'}
                      </span>

                      {registered ? (
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Registered
                        </span>
                      ) : (
                        <button
                          onClick={() => openParentRegisterForm(e)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all"
                        >
                          Register Child
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS & FORMS COMPONENT LOGIC                                         */}
      {/* ========================================================================= */}

      {/* MODAL 1: REGISTRATION SUBMISSION FORM */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <form onSubmit={executeEventRegistrationSubmit} className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-lg shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 text-left bg-white dark:bg-[#1e293b]">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{editingRegistration ? 'Edit Event Registration' : 'Event Registration Form'}</h2>
                  <p className="text-xs text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">{showRegisterModal.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowRegisterModal(null); setEditingRegistration(null); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left custom-scrollbar">
              {/* Warnings and Deadline Alert */}
              <div className="p-4 bg-blue-50 border-blue-250 rounded-xl space-y-1">
                <span className="text-[9.5px] font-black text-blue-800 uppercase tracking-wider block">Registration Guidelines</span>
                <p className="text-[11px] text-blue-700 font-semibold leading-relaxed">
                  Sign-ups for this event will close on {showRegisterModal.deadline}. Please make sure to fill in all required details before submitting.
                </p>
              </div>

              {/* Basic Info Autofills */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-1.5">
                  1. Basic Information (Autofilled — Editable)
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Student Name</label>
                    <input
                      type="text"
                      required
                      value={regFormData.studentName}
                      onChange={e => setRegFormData({ ...regFormData, studentName: e.target.value })}
                      placeholder="Full name of the student"
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Student ID</label>
                    <input
                      type="text"
                      required
                      value={regFormData.studentId}
                      onChange={e => setRegFormData({ ...regFormData, studentId: e.target.value })}
                      placeholder="Student ID"
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Grade / Class</label>
                    <input
                      type="text"
                      required
                      value={regFormData.studentGrade}
                      onChange={e => setRegFormData({ ...regFormData, studentGrade: e.target.value })}
                      placeholder="e.g. Grade 5"
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">School Campus</label>
                    <input
                      type="text"
                      required
                      value={regFormData.studentSchool}
                      onChange={e => setRegFormData({ ...regFormData, studentSchool: e.target.value })}
                      placeholder="School campus name"
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Parent Name</label>
                    <input
                      type="text"
                      required
                      value={regFormData.parentName}
                      onChange={e => setRegFormData({ ...regFormData, parentName: e.target.value })}
                      placeholder="Parent Name"
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Emergency Contact</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={regFormData.parentPhone}
                        onChange={e => setRegFormData({ ...regFormData, parentPhone: e.target.value })}
                        placeholder="+91 0000000000"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event-Specific Dynamic Custom Fields */}
              {showRegisterModal.customFields && showRegisterModal.customFields.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-1.5">
                    2. Event Specific Entry Details
                  </h4>

                  <div className="space-y-3.5">
                    {showRegisterModal.customFields.map((field) => (
                      <div key={field}>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                          {field}
                        </label>
                        {field.includes('Level') ? (
                          <div className="relative">
                            <select
                              required
                              value={regFormData.customFieldValues[field] || ''}
                              onChange={e => setRegFormData({
                                ...regFormData,
                                customFieldValues: { ...regFormData.customFieldValues, [field]: e.target.value }
                              })}
                              className="w-full px-4 pr-10 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs cursor-pointer appearance-none"
                            >
                              <option value="">Select Level</option>
                              <option value="Beginner">Beginner Level</option>
                              <option value="Intermediate">Intermediate Level</option>
                              <option value="Advanced">Advanced Level</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        ) : (
                          <input
                            type="text"
                            required
                            value={regFormData.customFieldValues[field] || ''}
                            onChange={e => setRegFormData({
                              ...regFormData,
                              customFieldValues: { ...regFormData.customFieldValues, [field]: e.target.value }
                            })}
                            placeholder={`Enter ${field}`}
                            className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#283548] bg-slate-50 dark:bg-[#283548]/30 px-6 py-4 flex items-center justify-end gap-3 z-10 bg-white dark:bg-[#1e293b]">
              <button
                type="button"
                onClick={() => { setShowRegisterModal(null); setEditingRegistration(null); }}
                className="modal-btn-cancel"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn-save bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                {editingRegistration ? 'Save Changes' : 'Submit Registration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: ADMIN NEW EVENT CREATOR FORM */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveEvent} className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-lg shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-[#283548] flex items-center justify-between flex-shrink-0 text-left bg-white dark:bg-[#1e293b]">
              <div className="flex items-center gap-2">
                {editingEvent ? <Pencil className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{editingEvent ? `Edit Event: ${editingEvent.title}` : 'Create Custom STEM Event'}</h2>
                  <p className="text-[10px] text-slate-400 dark:text-[#64748b] font-bold uppercase tracking-wider">
                    {editingEvent ? 'Update details, capacities, workflows & custom dynamic fields' : 'Configure capacities, workflows & custom dynamic fields'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEventModal}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#283548] hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-500 text-gray-400 dark:text-[#64748b] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-left custom-scrollbar">
              {/* Event details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-1">1. Event General Details</h4>

                {(!currentUser?.school_id || currentUser?.school_id === 'All') && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Target School / Institution</label>
                    <div className="relative">
                      <select
                        value={newEventData.schoolId}
                        onChange={e => setNewEventData({ ...newEventData, schoolId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs appearance-none cursor-pointer"
                      >
                        <option value="">All Schools (Global Event)</option>
                        {schools.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={newEventData.title}
                    onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                    placeholder="e.g. Young Scientist Lab Fair"
                    className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Description</label>
                  <textarea
                    required
                    value={newEventData.description}
                    onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                    placeholder="Provide a comprehensive event description..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Category</label>
                    <div className="relative">
                      <select
                        value={newEventData.category}
                        onChange={e => setNewEventData({ ...newEventData, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs appearance-none cursor-pointer"
                      >
                        <option value="Robotics">Robotics</option>
                        <option value="Coding">Coding</option>
                        <option value="Science">Science</option>
                        <option value="Math">Mathematics</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Venue Location</label>
                    <input
                      type="text"
                      required
                      value={newEventData.venue}
                      onChange={e => setNewEventData({ ...newEventData, venue: e.target.value })}
                      placeholder="e.g. Science Wing Pavilion"
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Event Date</label>
                    <input
                      type="date"
                      required
                      value={newEventData.date}
                      onChange={e => setNewEventData({ ...newEventData, date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Registration Deadline</label>
                    <input
                      type="date"
                      required
                      value={newEventData.deadline}
                      onChange={e => setNewEventData({ ...newEventData, deadline: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Capacities & Workflow */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-1">2. Capacity & Workflow Engines</h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1 ml-1" title="Max Individual Slots">Max Slots</label>
                    <input
                      type="number"
                      required
                      value={newEventData.maxParticipants}
                      onChange={e => setNewEventData({ ...newEventData, maxParticipants: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1 ml-1" title="Max Team Limit">Max Teams</label>
                    <input
                      type="number"
                      required
                      value={newEventData.maxTeams}
                      onChange={e => setNewEventData({ ...newEventData, maxTeams: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1 ml-1" title="Waitlist Size ceiling">Waitlist Limit</label>
                    <input
                      type="number"
                      required
                      value={newEventData.waitlistLimit}
                      onChange={e => setNewEventData({ ...newEventData, waitlistLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] font-black text-slate-700 block">Instant Auto Approval Workflow</span>
                    <p className="text-[9.5px] text-slate-400 font-semibold">Bypass pending lists and approve slots immediately</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newEventData.autoApproval}
                    onChange={e => setNewEventData({ ...newEventData, autoApproval: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-350 focus:ring-blue-500 text-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Field Selectors */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-1">3. Dynamic Registration Inputs</h4>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Check custom fields to require in registration forms:</p>

                <div className="grid grid-cols-2 gap-3.5 text-[11px] font-semibold text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border-slate-150 rounded-xl hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newEventData.customFieldInputs.teamName}
                      onChange={e => setNewEventData({
                        ...newEventData,
                        customFieldInputs: { ...newEventData.customFieldInputs, teamName: e.target.checked }
                      })}
                      className="rounded border-slate-300 focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Team Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border-slate-150 rounded-xl hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newEventData.customFieldInputs.teamMembers}
                      onChange={e => setNewEventData({
                        ...newEventData,
                        customFieldInputs: { ...newEventData.customFieldInputs, teamMembers: e.target.checked }
                      })}
                      className="rounded border-slate-300 focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Team Members Count</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border-slate-150 rounded-xl hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newEventData.customFieldInputs.experienceLevel}
                      onChange={e => setNewEventData({
                        ...newEventData,
                        customFieldInputs: { ...newEventData.customFieldInputs, experienceLevel: e.target.checked }
                      })}
                      className="rounded border-slate-300 focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Experience Level</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border-slate-150 rounded-xl hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newEventData.customFieldInputs.projectTitle}
                      onChange={e => setNewEventData({
                        ...newEventData,
                        customFieldInputs: { ...newEventData.customFieldInputs, projectTitle: e.target.checked }
                      })}
                      className="rounded border-slate-300 focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Project Title</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border-slate-150 rounded-xl hover:bg-slate-100 transition-colors col-span-2">
                    <input
                      type="checkbox"
                      checked={newEventData.customFieldInputs.medicalInfo}
                      onChange={e => setNewEventData({
                        ...newEventData,
                        customFieldInputs: { ...newEventData.customFieldInputs, medicalInfo: e.target.checked }
                      })}
                      className="rounded border-slate-300 focus:ring-blue-500 text-blue-600 w-4 h-4 cursor-pointer"
                    />
                    <span>Medical Info & Special Needs</span>
                  </label>
                </div>
              </div>

            </div>

            <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#283548] bg-slate-50 dark:bg-[#283548]/30 px-6 py-4 flex items-center justify-end gap-3 z-10 bg-white dark:bg-[#1e293b]">
              <button
                type="button"
                onClick={closeEventModal}
                className="modal-btn-cancel"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn-save bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                {editingEvent ? 'Save Event Changes' : 'Create Event Listing'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Events;
