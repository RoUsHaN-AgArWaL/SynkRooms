import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import { Join } from "./pages/Join";
import Chat from "./pages/Chat";
import RoomCreated from "./pages/RoomCreated";
import { ToastContainer } from "./components/Toast";

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/join" element={<Join />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/room-created" element={<RoomCreated />} />
      </Routes>
    </Router>
  );
}

export default App;
