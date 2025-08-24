function showSignup() {
  document.getElementById("login-form").classList.remove("active");
  document.getElementById("signup-form").classList.add("active");
}

function showLogin() {
  document.getElementById("signup-form").classList.remove("active");
  document.getElementById("login-form").classList.add("active");
}

function loginUser() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        alert(data.message || "Login failed!");
      }
    })
    .catch(() => alert("An error occurred during login!"));
}

function signupUser() {
  const username = document.getElementById("signup-username").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        alert("Signup successful! Please log in.");
        showLogin();
      } else {
        alert(data.message || "Signup failed!");
      }
    })
    .catch(() => alert("An error occurred during signup!"));
}

function createMeeting() {
  const username =
    localStorage.getItem("username") || prompt("Enter your username:");
  if (username) {
    localStorage.setItem("username", username);
    window.location.href = `/create-room?username=${encodeURIComponent(
      username
    )}`;
  }
}

function joinMeeting() {
  const roomId = prompt("Enter Room ID to join:");
  const username =
    localStorage.getItem("username") || prompt("Enter your username:");
  if (roomId && username) {
    localStorage.setItem("username", username);
    window.location.href = `/join-room?roomId=${roomId}&username=${encodeURIComponent(
      username
    )}`;
  }
}

document.getElementById("create").onclick = function () {
  window.location.href = "/create-room";
};

// --- Webcam video logic ---

// Webcam preview for dashboard only
window.addEventListener("DOMContentLoaded", () => {
  const videoGrid = document.getElementById("video-grid");
  if (!videoGrid) return;
  // Remove any previous video
  videoGrid.innerHTML = "";
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.width = "400px";
  video.style.borderRadius = "10px";
  video.style.background = "#222";
  videoGrid.appendChild(video);

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => {
        videoGrid.innerHTML =
          '<p style="color:red">Unable to access webcam: ' +
          err.message +
          "</p>";
      });
  } else {
    videoGrid.innerHTML =
      '<p style="color:red">Webcam not supported in this browser.</p>';
  }
});
