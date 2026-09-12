import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { SchoolProvider } from './contexts/SchoolContext';
import { Layout } from './components/Layout';
import { ConfirmProvider } from './components/ui';
import { Login } from './pages/Login';
import { LessonPlanning } from './pages/LessonPlanning';
import { Home } from './pages/Home';
import { ReportGenerator } from './pages/ReportGenerator';
import { PeiGenerator } from './pages/PeiGenerator';
import { Attendance } from './pages/Attendance';
import { Lessons } from './pages/Lessons';
import { Grades } from './pages/Grades';
import { Bulletin } from './pages/Bulletin';
import { TranscriptGenerator } from './pages/TranscriptGenerator';
import { ClassManagement } from './pages/ClassManagement';
import { UserManagement } from './pages/UserManagement';
import { StudentManagement } from './pages/StudentManagement';
import { StudentProfile } from './pages/StudentProfile';
import { Settings } from './pages/Settings';
import { ClassDiary } from './pages/ClassDiary';
import { Agenda } from './pages/Agenda';
import { PedagogicalIntelligence } from './pages/PedagogicalIntelligence';
import { PlatformAdmin } from './pages/PlatformAdmin';
import { ResetPassword } from './pages/ResetPassword';
import { Finance } from './pages/Finance';
import { FamilyFinance } from './pages/FamilyFinance';
import { Observations } from './pages/Observations';

export function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <Toaster position="top-right" richColors />
        <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/reports" element={<ReportGenerator />} />
              <Route path="/pei" element={<PeiGenerator />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/grades" element={<Grades />} />
              <Route path="/bulletin" element={<Bulletin />} />
              <Route path="/transcript" element={<TranscriptGenerator />} />
              <Route path="/intelligence" element={<PedagogicalIntelligence />} />
              <Route path="/classes" element={<ClassManagement />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/students" element={<StudentManagement />} />
              <Route path="/students/:id" element={<StudentProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/diary" element={<ClassDiary />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/planning" element={<LessonPlanning />} />
              <Route path="/admin" element={<PlatformAdmin />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/observations" element={<Observations />} />
              <Route path="/family/finance" element={<FamilyFinance />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        </ConfirmProvider>
      </SchoolProvider>
    </AuthProvider>
  );
}

export default App;
