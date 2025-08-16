import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000'; // Set to your Django backend URL if needed

const getCSRFToken = async(url) => {
  await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
};

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState([]);
  const [status, setStatus] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (loggedIn) fetchGames();
  }, [loggedIn]);

  const Minesweeper = ({ cols }) => {
    const handleClick = async (e, row, col) => {
      e.preventDefault(); // important! prevents the context menu from opening

      const click_val = e.type == "click" ? "reveal" : "toggle_flag";
      const currentLabel = board[row][col].label;
      if (currentLabel == 'F') {
        if (click_val != "toggle_flag") {
          return;
        }
      } else if (currentLabel != undefined) {
        return;
      }
      const token = await getCSRFToken(`${API_BASE}/games/update_cell/`);
      const res = await fetch(`${API_BASE}/games/update_cell/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': token,
        },
        body: JSON.stringify({
          "row": row,
          "col": col,
          "value": click_val,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      setBoard(data.board_state || []);
      setStatus(data.status || '');
    };

    return (
      <div
        className="grid gap-1"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 40px)`,
        }}
      >
        {board.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            // const revealed = cell.label != undefined && cell.label != "F";
            const revealed = (status === "won" || status === "lost")
              ? true // reveal everything if game is over
              : (cell.label != undefined && cell.label !== "F");
            const cellLabel = (status === "won" || status === "lost")
              ? cell.value
              : cell.label == undefined ? "_" : cell.label
            return (<button
              key={`${rIdx}-${cIdx}`}
              onClick={(e) => handleClick(e, rIdx, cIdx)}
              onContextMenu={(e) => handleClick(e, rIdx, cIdx)}
              style={{
                width: "40px",
                height: "40px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cell.value === "M" && revealed
                  ? "#EF4444" // red if it's a mine
                  : revealed
                    ? "#3B82F6" // blue for revealed safe cells
                    : "#FFFFFF", // white for hidden
                color: revealed ? "#000000" : "#888888",           // black text if label exists
              }}
            >
              {/* {cell.label == undefined ? "_" : cell.label} */}
              {cellLabel}
            </button>);
          })
        )}
      </div>
    );
  };

  const loginUser = async () => {
    const csrfToken = await getCSRFToken(`${API_BASE}/api-auth/login/`);
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
          // 'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.length > 0) {
        setBoard(data[0].board_state || []);
        setStatus(data[0].status || '');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const initializeGame = async () => {
    setLoading(true);
    try {
      const token = await getCSRFToken(`${API_BASE}/games/initialize/`);
      const res = await fetch(`${API_BASE}/games/initialize/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': token,
        },
        credentials: 'include',
      });
      const newGame = await res.json();
      await fetchGames();
      setBoard(newGame.board_state || []);
      setStatus(newGame.status || '');
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
      {(status === "won" || status === "lost") && (
        <div
          className={`p-2 mb-4 rounded text-white transition-all duration-500 ${
            status === "won" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {status === "won" ? "🎉 You Won!" : "💥 You Lost!"}
        </div>
      )}
      {loading && <p>Loading...</p>}
      {!loading && (
        <>
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">Minesweeper Grid</h1>
            <Minesweeper cols={10} />
          </div>
        </>
      )}
    </div>
  );
}
