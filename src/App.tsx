import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { YearProvider } from './contexts/YearContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
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
import { TimeClock } from './pages/TimeClock';

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <YearProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/reports" element={<ReportGenerator />} />
                <Route path="/pei" element={<PeiGenerator />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/lessons" element={<Lessons />} />
                <Route path="/grades" element={<Grades />} />
                <Route path="/bulletin" element={<Bulletin />} />
                <Route path="/transcript" element={<TranscriptGenerator />} />

                <Route path="/classes" element={<ClassManagement />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/students" element={<StudentManagement />} />
                <Route path="/students/:id" element={<StudentProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/diary" element={<ClassDiary />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/time-clock" element={<TimeClock />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </YearProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
