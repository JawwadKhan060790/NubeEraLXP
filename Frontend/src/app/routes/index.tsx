/**
 * Application Route Configuration
 *
 * All routes are defined here as plain data — no JSX scattered across App.tsx.
 * The AuthenticatedLayout component reads this config to render <Routes>.
 *
 * Route groups:
 *   publicRoutes   — accessible without authentication (login page)
 *   privateRoutes  — accessible to all authenticated users
 *   adminRoutes    — restricted to admin / superadmin
 *   staffRoutes    — extended routes for staff role
 *   teacherRoutes  — extended routes for teacher role
 *   shopRoutes     — e-commerce storefront (all roles)
 *   supportRoutes  — support ticket system (all roles)
 */

import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { ROLES, ROLE_GROUPS } from '../../constants/roles';
import { RoleProtectedRoute } from './RoleProtectedRoute';

// ── Lazy-loaded page imports ────────────────────────────────────────────────────────────────────────────────────
// Each page is lazy-loaded from its owning module for route-level code splitting.
// To add a new page: (1) add the component to modules/<module>/pages/, (2) re-export
// it from modules/<module>/index.ts, (3) add a React.lazy import below.

// dashboard
const Dashboard          = React.lazy(() => import('../../modules/dashboard/pages/Dashboard'));
const StaffDashboard     = React.lazy(() => import('../../modules/dashboard/pages/StaffDashboard'));
const TeacherDashboard   = React.lazy(() => import('../../modules/dashboard/pages/TeacherDashboard'));
const StudentDashboard   = React.lazy(() => import('../../modules/dashboard/pages/StudentDashboard'));
const ParentDashboard    = React.lazy(() => import('../../modules/dashboard/pages/ParentDashboard'));

// schools
const Schools            = React.lazy(() => import('../../modules/schools/pages/Schools'));
const Grades             = React.lazy(() => import('../../modules/schools/pages/Grades'));
const GradeSections      = React.lazy(() => import('../../modules/schools/pages/GradeSections'));

// teachers
const Teachers           = React.lazy(() => import('../../modules/teachers/pages/Teachers'));
const PendingTeachers    = React.lazy(() => import('../../modules/teachers/pages/PendingTeachers'));
const CreateTeacher      = React.lazy(() => import('../../modules/teachers/pages/CreateTeacher'));
const TeacherFees        = React.lazy(() => import('../../modules/teachers/pages/TeacherFees'));
const TeacherSchoolAssignment = React.lazy(() => import('../../modules/teachers/pages/TeacherSchoolAssignment'));
// teacher enhancement module
const TeacherLearningPath     = React.lazy(() => import('../../modules/teachers/pages/TeacherLearningPath'));
const TeachingPath            = React.lazy(() => import('../../modules/teachers/pages/TeachingPath'));
const TeacherScheduleCalendar = React.lazy(() => import('../../modules/teachers/pages/TeacherScheduleCalendar'));
const TeacherGradeStudents    = React.lazy(() => import('../../modules/teachers/pages/TeacherGradeStudents'));
const StudentWeaknessAnalysis = React.lazy(() => import('../../modules/teachers/pages/StudentWeaknessAnalysis'));

// curriculum (School-Based Curriculum Assignment)
const CurriculumAssignment = React.lazy(() => import('../../modules/curriculum/pages/CurriculumAssignment'));
const CurriculumDashboard  = React.lazy(() => import('../../modules/curriculum/pages/CurriculumDashboard'));

// students
const Students           = React.lazy(() => import('../../modules/students/pages/Students'));
const StudentLearning    = React.lazy(() => import('../../modules/students/pages/StudentLearning'));
const StudentCalendar    = React.lazy(() => import('../../modules/students/pages/StudentCalendar'));

// users / admin
const Users              = React.lazy(() => import('../../modules/users/pages/Users'));
const CreateStaff        = React.lazy(() => import('../../modules/users/pages/CreateStaff'));
const WebsiteRegistrations = React.lazy(() => import('../../modules/users/pages/WebsiteRegistrations'));
const AdminSettings      = React.lazy(() => import('../../modules/users/pages/AdminSettings'));
const RecycleBin         = React.lazy(() => import('../../modules/users/pages/RecycleBin'));
const DatabaseBackupRestore = React.lazy(() => import('../../modules/users/pages/DatabaseBackupRestore'));
const DataImport          = React.lazy(() => import('../../modules/import/pages/DataImport'));

// academics
const Subjects           = React.lazy(() => import('../../modules/academics/pages/Subjects'));
const Modules            = React.lazy(() => import('../../modules/academics/pages/Modules'));
const Lessons            = React.lazy(() => import('../../modules/academics/pages/Lessons'));
const StaffModuleQuestions = React.lazy(() => import('../../modules/academics/pages/StaffModuleQuestions'));
const TeacherScheduler   = React.lazy(() => import('../../modules/academics/pages/TeacherScheduler'));

// exams
const Exams              = React.lazy(() => import('../../modules/exams/pages/Exams'));

// attendance
const TeacherAttendance     = React.lazy(() => import('../../modules/attendance/pages/TeacherAttendance'));
const UnifiedAttendancePage = React.lazy(() => import('../../modules/attendance/pages/UnifiedAttendancePage'));
// legacy pages kept but now redirected:
// StudentAttendancePage and TeacherAttendancePage are no longer registered as active routes.

// events
const Events             = React.lazy(() => import('../../modules/eventsHub/pages/Events'));

// reports
const Reports            = React.lazy(() => import('../../modules/reports/pages/Reports'));
const ReportView         = React.lazy(() => import('../../modules/reports/pages/ReportView'));

// auth / account
const UpdateProfile      = React.lazy(() => import('../../modules/auth/pages/UpdateProfile'));
const ChangePassword     = React.lazy(() => import('../../modules/auth/pages/ChangePassword'));
const Unauthorized       = React.lazy(() => import('../../modules/auth/pages/Unauthorized'));

// certificates
const CertificatesAdminHub = React.lazy(() => import('../../modules/certificates/pages/CertificatesAdminHub'));
const MyCertificates     = React.lazy(() => import('../../modules/certificates/pages/MyCertificates'));
const GenerateCertificate = React.lazy(() => import('../../modules/certificates/pages/GenerateCertificate'));

// report cards
const ReportCardsAdminHub = React.lazy(() => import('../../modules/reportCards/pages/ReportCardsAdminHub'));
const GenerateReportCard  = React.lazy(() => import('../../modules/reportCards/pages/GenerateReportCard'));
const ReportCardPreview   = React.lazy(() => import('../../modules/reportCards/pages/ReportCardPreview'));
const MyReportCards       = React.lazy(() => import('../../modules/reportCards/pages/MyReportCards'));
const ChildReportCards    = React.lazy(() => import('../../modules/reportCards/pages/ChildReportCards'));

// equipment hub (e-commerce)
const ShopHome           = React.lazy(() => import('../../modules/equipmentHub/pages/ShopHome'));
const ProductListing     = React.lazy(() => import('../../modules/equipmentHub/pages/ProductListing'));
const ProductDetail      = React.lazy(() => import('../../modules/equipmentHub/pages/ProductDetail'));
const CartPage           = React.lazy(() => import('../../modules/equipmentHub/pages/CartPage'));
const WishlistPage       = React.lazy(() => import('../../modules/equipmentHub/pages/WishlistPage'));
const CheckoutPage       = React.lazy(() => import('../../modules/equipmentHub/pages/CheckoutPage'));
const OrderSuccessPage   = React.lazy(() => import('../../modules/equipmentHub/pages/OrderSuccessPage'));
const OrderTrackingPage  = React.lazy(() => import('../../modules/equipmentHub/pages/OrderTrackingPage'));
const OrderHistoryPage   = React.lazy(() => import('../../modules/equipmentHub/pages/OrderHistoryPage'));
const ShopAdminHub       = React.lazy(() => import('../../modules/equipmentHub/pages/ShopAdminHub'));

// support tickets
const TicketList         = React.lazy(() => import('../../modules/supportTickets/pages/TicketList'));
const RaiseTicket        = React.lazy(() => import('../../modules/supportTickets/pages/RaiseTicket'));
const TicketDetails      = React.lazy(() => import('../../modules/supportTickets/pages/TicketDetails'));
const AdminSupportHub    = React.lazy(() => import('../../modules/supportTickets/pages/AdminSupportHub'));

// doubt hub
const StudentDoubtHub    = React.lazy(() => import('../../modules/students/pages/StudentDoubtHub'));
const TeacherDoubtHub    = React.lazy(() => import('../../modules/teachers/pages/TeacherDoubtHub'));
const AdminDoubtHub      = React.lazy(() => import('../../modules/students/pages/AdminDoubtHub'));


// ── Route config type ─────────────────────────────────────────────────────────────────────────────────────────

export interface RouteConfig {
  path: string;
  element: React.ReactElement;
  allowedRoles?: string[];
}

// ── Helper: wrap element in role guard ────────────────────────────────────────────────────────────────────────────────────

const protect = (allowedRoles: string[], element: React.ReactElement) => (
  <RoleProtectedRoute allowedRoles={allowedRoles as never}>{element}</RoleProtectedRoute>
);

const adminOnly  = (el: React.ReactElement) => protect([ROLES.SUPER_ADMIN, ROLES.ADMIN], el);
const staffLevel = (el: React.ReactElement) => protect(ROLE_GROUPS.SCHOOL_MANAGERS, el);
const adminStaffLevel = (el: React.ReactElement) => protect([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF], el);
const eduLevel   = (el: React.ReactElement) => protect(ROLE_GROUPS.EDUCATORS, el);
const allRoles   = (el: React.ReactElement) => protect(ROLE_GROUPS.ALL, el);

// ── Route definitions ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Renders all authenticated routes as a flat list of <Route> elements.
 * Consumed by AuthenticatedLayout's <Routes>.
 */
export const AuthenticatedRoutes = ({ userUtype }: { userUtype: string }): React.ReactElement => {
  const defaultDash =
    userUtype === 'superadmin'                          ? ROUTES.ADMIN_DASHBOARD :
    userUtype === 'admin'                               ? ROUTES.ADMIN_DASHBOARD :
    userUtype === 'principal'                           ? ROUTES.PRINCIPAL_DASHBOARD :
    userUtype === 'staff'                               ? ROUTES.STAFF_DASHBOARD :
    userUtype === 'teacher'                             ? ROUTES.TEACHER_DASHBOARD :
    userUtype === 'parent'                              ? ROUTES.PARENT_DASHBOARD :
    ROUTES.STUDENT_DASHBOARD;

  return (
    <>
      {/* ── Default redirect ───────────────────────────────────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to={defaultDash} replace />} />

      {/* ── Dashboards ────────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.ADMIN_DASHBOARD}     element={protect([ROLES.SUPER_ADMIN, ROLES.ADMIN], <Dashboard />)} />
      <Route path={ROUTES.PRINCIPAL_DASHBOARD} element={protect([ROLES.PRINCIPAL], <Dashboard />)} />
      <Route path={ROUTES.STAFF_DASHBOARD}     element={protect([ROLES.STAFF], <StaffDashboard />)} />
      <Route path={ROUTES.TEACHER_DASHBOARD}   element={protect([ROLES.TEACHER], <TeacherDashboard />)} />
      <Route path={ROUTES.STUDENT_DASHBOARD}   element={protect([ROLES.STUDENT], <StudentDashboard />)} />
      <Route path={ROUTES.PARENT_DASHBOARD}    element={protect([ROLES.PARENT], <ParentDashboard />)} />

      {/* ── Institution management ──────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.SCHOOLS}  element={staffLevel(<Schools />)} />
      <Route path={ROUTES.TEACHERS} element={staffLevel(<Teachers />)} />
      <Route path={ROUTES.STUDENTS} element={eduLevel(<Students />)} />
      <Route path={ROUTES.GRADES}         element={staffLevel(<Grades />)} />
      <Route path={ROUTES.GRADE_SECTIONS} element={staffLevel(<GradeSections />)} />
      <Route path={ROUTES.USERS}          element={adminOnly(<Users />)} />

      {/* ── Academics ──────────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.SUBJECTS} element={eduLevel(<Subjects />)} />
      <Route path={ROUTES.MODULES} element={eduLevel(<Modules />)} />
      <Route path={ROUTES.LESSONS} element={eduLevel(<Lessons />)} />
      <Route path={ROUTES.EXAMS}   element={eduLevel(<Exams />)} />
      <Route path={ROUTES.EVENTS}  element={<Events />} />

      {/* ── Reports (educators only — backend enforces per-school, per-role scoping) */}
      <Route path={ROUTES.REPORTS}     element={eduLevel(<Reports />)} />
      <Route path={ROUTES.REPORT_VIEW} element={eduLevel(<ReportView />)} />

      {/* ── Account ────────────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.UPDATE_PROFILE}  element={<UpdateProfile />} />
      <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePassword />} />

      {/* ── Admin management ──────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.CREATE_STAFF}         element={adminOnly(<CreateStaff />)} />
      <Route path={ROUTES.CREATE_TEACHER}       element={staffLevel(<CreateTeacher />)} />
      <Route path={ROUTES.ADMIN_SETTINGS}       element={adminOnly(<AdminSettings />)} />
      <Route path={ROUTES.RECYCLE_BIN}          element={adminOnly(<RecycleBin />)} />
      <Route path={ROUTES.DATA_IMPORT}          element={adminStaffLevel(<DataImport />)} />
      <Route path={ROUTES.ADMIN_BACKUP_RESTORE} element={adminOnly(<DatabaseBackupRestore />)} />
      <Route path={ROUTES.TEACHER_FEE_SETTING}  element={staffLevel(<TeacherFees />)} />
      <Route path={ROUTES.PENDING_TEACHERS}     element={adminOnly(<PendingTeachers />)} />
      <Route path={ROUTES.WEBSITE_REGISTRATIONS}element={staffLevel(<WebsiteRegistrations />)} />

      {/* ── School-Based Curriculum & Multi-School Teacher Management ──────────────────────────────────────────── */}
      <Route path={ROUTES.CURRICULUM_ASSIGNMENT}     element={adminStaffLevel(<CurriculumAssignment />)} />
      <Route path={ROUTES.CURRICULUM_DASHBOARD}      element={adminStaffLevel(<CurriculumDashboard />)} />
      <Route path={ROUTES.TEACHER_SCHOOL_ASSIGNMENT} element={adminStaffLevel(<TeacherSchoolAssignment />)} />

      {/* ── Staff extended ───────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={`${ROUTES.STAFF_SCHOOLS}/*`}   element={staffLevel(<Schools />)} />
      <Route path={`${ROUTES.STAFF_GRADES}/*`}    element={staffLevel(<Grades />)} />
      <Route path={`${ROUTES.STAFF_SECTIONS}/*`}  element={staffLevel(<GradeSections />)} />
      <Route path={`${ROUTES.STAFF_MODULES}/*`}   element={staffLevel(<Modules />)} />
      <Route path={`${ROUTES.STAFF_LESSONS}/*`}   element={staffLevel(<Lessons />)} />
      <Route path={`${ROUTES.STAFF_EXAMS}/*`}     element={staffLevel(<Exams />)} />
      <Route path={`${ROUTES.STAFF_QUESTIONS}/*`} element={staffLevel(<StaffModuleQuestions />)} />
      <Route path={`${ROUTES.STAFF_SCHEDULER}/*`} element={staffLevel(<TeacherScheduler />)} />

      {/* ── Teacher extended ───────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.TEACHER_STUDENTS}   element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <Students />)} />
      <Route path={`${ROUTES.TEACHER_EXAMS}/*`}    element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <Exams />)} />
      <Route path={`${ROUTES.TEACHER_QUESTIONS}/*`}element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <StaffModuleQuestions />)} />
      <Route path={`${ROUTES.TEACHER_SCHEDULER}/*`}element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <TeacherScheduler />)} />
      <Route path={ROUTES.TEACHER_CALENDAR}   element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <TeacherScheduler />)} />
      <Route path={ROUTES.TEACHER_ATTENDANCE} element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.STAFF, ROLES.TEACHER], <TeacherAttendance />)} />
      {/* Unified Attendance Hub — replaces the two legacy routes */}
      <Route path={ROUTES.ATTENDANCE} element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.STAFF, ROLES.PRINCIPAL], <UnifiedAttendancePage />)} />
      {/* Legacy redirects so old bookmarks still work */}
      <Route path={ROUTES.STUDENT_ATTENDANCE}          element={<Navigate to={ROUTES.ATTENDANCE} replace />} />
      <Route path={ROUTES.TEACHER_ATTENDANCE_REGISTRY} element={<Navigate to={ROUTES.ATTENDANCE} replace />} />

      {/* ── Teacher Enhancement Module ──────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.TEACHER_LEARNING_PATH}      element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <TeacherLearningPath />)} />
      <Route path={ROUTES.TEACHER_TEACHING_PATH}     element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <TeachingPath />)} />
      <Route path={ROUTES.TEACHER_SCHEDULE_CALENDAR}  element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <TeacherScheduleCalendar />)} />
      <Route path={ROUTES.TEACHER_GRADE_STUDENTS}     element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <TeacherGradeStudents />)} />
      <Route path={ROUTES.TEACHER_STUDENT_WEAKNESS}      element={protect([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER], <StudentWeaknessAnalysis />)} />
      {/* Syllabus completion is surfaced via learning path — redirect there */}
      <Route path={ROUTES.TEACHER_SYLLABUS_COMPLETION}   element={<Navigate to={ROUTES.TEACHER_LEARNING_PATH} replace />} />

      {/* ── Student ────────────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.STUDENT_LEARNING} element={protect([ROLES.STUDENT], <StudentLearning />)} />
      <Route path={ROUTES.STUDENT_CALENDAR} element={protect([ROLES.STUDENT], <StudentCalendar />)} />
      <Route path={ROUTES.PARENT_CHILD_CALENDAR} element={protect([ROLES.PARENT], <StudentCalendar />)} />

      {/* ── Certificates ─────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.CERTIFICATES_HUB} element={adminStaffLevel(<CertificatesAdminHub />)} />
      <Route path={ROUTES.MY_CERTIFICATES}  element={protect([ROLES.STUDENT], <MyCertificates />)} />
      <Route path={ROUTES.CERTIFICATES_GENERATE} element={adminStaffLevel(<GenerateCertificate />)} />
      <Route path={ROUTES.CERTIFICATES_BULK} element={adminStaffLevel(<GenerateCertificate />)} />

      {/* ── Report Cards ────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.REPORT_CARDS_HUB}     element={adminStaffLevel(<ReportCardsAdminHub />)} />
      <Route path={ROUTES.GENERATE_REPORT_CARD} element={adminStaffLevel(<GenerateReportCard />)} />
      <Route path={ROUTES.REPORT_CARD_PREVIEW}  element={allRoles(<ReportCardPreview />)} />
      <Route path={ROUTES.MY_REPORT_CARDS}      element={protect([ROLES.STUDENT], <MyReportCards />)} />
      <Route path={ROUTES.CHILD_REPORT_CARDS}   element={protect([ROLES.PARENT], <ChildReportCards />)} />

      {/* ── Equipment Hub (E-Commerce) ──────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.SHOP_HOME}           element={<ShopHome />} />
      <Route path={ROUTES.SHOP_PRODUCTS}       element={<ProductListing />} />
      <Route path={ROUTES.SHOP_PRODUCT_DETAIL} element={<ProductDetail />} />
      <Route path={ROUTES.SHOP_CART}           element={<CartPage />} />
      <Route path={ROUTES.SHOP_WISHLIST}       element={<WishlistPage />} />
      <Route path={ROUTES.SHOP_CHECKOUT}       element={<CheckoutPage />} />
      <Route path={ROUTES.SHOP_ORDER_SUCCESS}  element={<OrderSuccessPage />} />
      <Route path={ROUTES.SHOP_ORDER_TRACKING} element={<OrderTrackingPage />} />
      <Route path={ROUTES.SHOP_ORDERS}         element={<OrderHistoryPage />} />
      <Route path={ROUTES.SHOP_ADMIN}          element={staffLevel(<ShopAdminHub />)} />

      {/* ── Support Tickets ────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.SUPPORT_TICKETS}       element={<TicketList />} />
      <Route path={ROUTES.SUPPORT_RAISE_TICKET}  element={<RaiseTicket />} />
      <Route path={ROUTES.SUPPORT_TICKET_DETAIL} element={<TicketDetails />} />
      <Route path={ROUTES.SUPPORT_ANALYTICS}     element={staffLevel(<AdminSupportHub />)} />

      {/* ── Doubt Hub ─────────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.STUDENT_DOUBT_HUB}     element={protect([ROLES.STUDENT], <StudentDoubtHub />)} />
      <Route path={ROUTES.TEACHER_DOUBT_HUB}     element={protect([ROLES.TEACHER], <TeacherDoubtHub />)} />
      <Route path={ROUTES.ADMIN_DOUBT_HUB}       element={adminStaffLevel(<AdminDoubtHub />)} />


      {/* ── Misc ─────────────────────────────────────────────────────────────────────────────────────────────── */}
      <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />
      <Route path="*" element={<Navigate to={defaultDash} replace />} />
    </>
  );
};
