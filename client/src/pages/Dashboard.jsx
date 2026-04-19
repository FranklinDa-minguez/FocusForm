import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);
  useEffect(() => {
  if (!user) return;

  fetch(`http://localhost:5000/session/${user.uid}`)
    .then(res => res.json())
    .then(data => {
      console.log("Sessions from backend:", data);
      setSessions(data);
    })
    .catch(err => console.log(err));
}, [user]);
  const email = location.state?.email || user?.email;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the Dashboard{email ? `, ${email}` : ""}!</p>
      <pre>{JSON.stringify(sessions, null, 2)}</pre>
      <button type="button" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  );
};

export default Dashboard;