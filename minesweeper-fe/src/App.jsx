import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000'; // Set to your Django backend URL if needed

const Minesweeper = ({ data, rows = 8, cols = 8 }) => {
  // initialize board state (hidden by default)
  const [revealed, setRevealed] = useState(
    Array(rows * cols).fill(false)
  );

  const handleClick = (index) => {
    setRevealed((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  return (
    <div className="grid gap-1"
      style={{
        display: "grid", // ✅ ensure grid display
        gridTemplateColumns: `repeat(${cols}, 40px)`, // ✅ column layout
      }}
    >
      {data.map((row, rIdx) =>
        row.map((cell, cIdx) => (
          <button
            key={`${rIdx}-${cIdx}`}
            onClick={() => handleClick(rIdx, cIdx)}
            className="border rounded bg-white flex items-center justify-center text-sm font-medium text-gray-800"
          >
            {cell.label || '_'}
          </button>
        ))
      )}
    </div>
  );
};

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (loggedIn) fetchGames();
  }, [loggedIn]);

  // Run once when the component mounts
  useEffect(() => {
    getCSRFToken();
  }, []);

  // async function getCSRFToken() {
  //   await fetch(`${API_BASE}/api-auth/login/`, {
  //     method: 'GET',
  //     credentials: 'include',
  //   });
  
  //   const match = document.cookie.match(/csrftoken=([^;]+)/);
  //   setCsrfToken(match ? match[1] : null);
  // }
  const getCSRFToken = async() => {
    await fetch(`${API_BASE}/api-auth/login/`, {
      method: 'GET',
      credentials: 'include',
    });
  
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    setCsrfToken(match ? match[1] : null);
  };

  const loginUser = async () => {
    // await getCSRFToken()
    console.log("CSRF Token:", csrfToken);
    const formData = new URLSearchParams();
    formData.append('csrfmiddlewaretoken', csrfToken);
    formData.append('next', '/');
    formData.append('username', username);
    formData.append('password', password);
    formData.append('submit', 'Log in');
  
    const res = await fetch(`${API_BASE}/api-auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrfToken,
      },
      body: formData.toString(),
      credentials: 'include',
    });
  
    if (res.ok) {
      // Django might redirect after login; follow it
      setLoggedIn(true);
    } else {
      console.error('Login failed', await res.text());
    }
  };

  const fetchGames = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/games/`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      });
      console.log(res);
      const data = await res.json();
      setGames(data);
      if (data.length > 0) {
        setSelectedGame(data[0].id);
        setBoard(data[0].board_state || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const initializeGame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/games/initialize/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      });
      await res.json();
      await fetchGames();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!loggedIn) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">Login</h1>
        <input
          type="text"
          placeholder="Username"
          className="border p-2 mr-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 mr-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={loginUser}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Minesweeper – {username}</h1>
      <button
        onClick={initializeGame}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Initialize / Replace Game
      </button>
      {loading && <p>Loading...</p>}
      {!loading && (
        <>
          <div className="mb-4">
            <label className="mr-2">Select Game:</label>
            <select
              value={selectedGame || ''}
              onChange={(e) => {
                setSelectedGame(e.target.value);
                const g = games.find((game) => game.id == e.target.value);
                setBoard(g?.board_state || []);
              }}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  Game {g.id}
                </option>
              ))}
            </select>
          </div>

          {/* <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${board[0]?.length || 8}, 2rem)`,
            }}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const label = cell.label;

                // Decide colors
                let textColor = "text-gray-800";
                if (label === "1") textColor = "text-blue-500";
                if (label === "2") textColor = "text-green-600";
                if (label === "3") textColor = "text-red-500";
                if (label === "4") textColor = "text-purple-700";
                if (label === "5") textColor = "text-orange-600";
                if (label === "6") textColor = "text-cyan-600";
                if (label === "7") textColor = "text-black";
                if (label === "8") textColor = "text-gray-500";

                const isMine = label === "M";
                const display = isMine ? "💣" : label || "_";

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`border w-8 h-8 flex items-center justify-center font-bold ${
                      label ? "bg-gray-100" : "bg-gray-300"
                    } ${textColor}`}
                  >
                    {display}
                  </div>
                );
              })
            )}
          </div> */}
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">Minesweeper Grid</h1>
            <Minesweeper data={board} rows={8} cols={8} />
          </div>
        </>
      )}
    </div>
  );
}
