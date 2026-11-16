import { authClient } from "@app/auth/client";
import { Navigate, Route, Routes } from "react-router-dom";
import { SignInPage } from "../features/auth/SignInPage";
import { OperatingHoursPage } from "../features/hours/OperatingHoursPage";
import { WeeklySchedulePage } from "../features/schedule/WeeklySchedulePage";
import { StaffPage } from "../features/staff/StaffPage";
import { StaffShiftsPage } from "../features/staff/StaffShiftsPage";
import { TimeLogPage } from "../features/timelog/TimeLogPage";
import { AppLayout } from "../shared/ui/AppLayout";

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
        Loading…
      </main>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/schedule" replace />} />
        <Route path="schedule" element={<WeeklySchedulePage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/:staffId/shifts" element={<StaffShiftsPage />} />
        <Route path="hours" element={<OperatingHoursPage />} />
        <Route path="time-logs" element={<TimeLogPage />} />
        <Route path="*" element={<Navigate to="/schedule" replace />} />
      </Route>
    </Routes>
  );
}