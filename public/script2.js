const socket = io();

const videoGrid = document.getElementById("video-grid");
const myvideo = document.createElement("video");
myvideo.muted = true;

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: location.protocol === "https:" ? 443 : 3030,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // Free Google STUN
      {
        urls: "turn:relay1.expressturn.com:3478",
        username: "000000002071414040",
        credential: "j2pgZ9Yboh5X2I5+Ewl46wvd88M=",
      },
    ],
  },
});

let videoStream;
const peers = {}; // Keep track of peer connections

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    videoStream = stream;
    addVideoStream(myvideo, stream);

    peer.on("call", function (call) {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userid, username) => {
      console.log(`User connected: ${username} (${userid})`);
      setTimeout(() => {
        connectToNewUser(userid, videoStream);
      }, 1000); // short delay ensures the new peer is ready
    });

    // Handle chat input with Enter key
    let txt = $("#chat-input");

    $("html").keydown((event) => {
      if (event.which == 13 && txt.val().length !== 0) {
        console.log(`Sending message: ${txt.val()}`);
        socket.emit("message", {
          text: txt.val(),
          username: USERNAME,
        });
        txt.val("");
      }
    });

    // Listen for incoming messages
    socket.on("createMessage", (msg) => {
      console.log(`Received message from ${msg.username}: ${msg.text}`);
      $(".messages").append(
        `<li class="msg"><b>${msg.username}:</b> <br> ${msg.text}</li>`
      );
      scrollBottom();
    });

    socket.on("user-disconnected", (userid) => {
      console.log(`User disconnected: ${userid}`);
      if (peers[userid]) {
        peers[userid].close(); // triggers call.on("close")
        delete peers[userid];
      }
    });

    // Handle username updates
    socket.on("username-updated", (data) => {
      console.log(`Username updated: ${data.userId} -> ${data.newName}`);
      // You can update the UI to reflect the new username if needed
    });
  })
  .catch((err) => {
    console.error("Error accessing media devices:", err);
  });

peer.on("open", (id) => {
  console.log(
    `Peer opened with ID: ${id}, joining room: ${ROOM_ID} as ${USERNAME}`
  );
  // Send username to server when joining room
  socket.emit("join-room", ROOM_ID, id, USERNAME);
});

const connectToNewUser = function (userid, stream) {
  console.log(`Connecting to new user: ${userid}`);
  const call = peer.call(userid, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });
  peers[userid] = call; // Store peer connection
};

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

const scrollBottom = function () {
  let div = $(".messages").parent(); // Target the messages container
  div.scrollTop(div.prop("scrollHeight"));
};

const muteUnmute = () => {
  const audioTrack = videoStream.getAudioTracks()[0];
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
  if (audioTrack.enabled) {
    setMuteButton();
  } else {
    setUnmuteButton();
  }
};

const playStop = () => {
  const videoTrack = videoStream.getVideoTracks()[0];
  if (!videoTrack) return;
  videoTrack.enabled = !videoTrack.enabled;
  if (videoTrack.enabled) {
    setStopVideo();
    myvideo.style.display = "";
  } else {
    setPlayVideo();
    myvideo.style.display = "none";
  }
};

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `;
  const btn = document.querySelector(".main_mute_button");
  if (btn) btn.innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `;
  const btn = document.querySelector(".main_mute_button");
  if (btn) btn.innerHTML = html;
};

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `;
  const btn = document.querySelector(".main_video_button");
  if (btn) btn.innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
    <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `;
  const btn = document.querySelector(".main_video_button");
  if (btn) btn.innerHTML = html;
};

// Set initial button state on page load
window.addEventListener("DOMContentLoaded", () => {
  const audioTrack = videoStream && videoStream.getAudioTracks()[0];
  const videoTrack = videoStream && videoStream.getVideoTracks()[0];
  if (audioTrack) {
    if (audioTrack.enabled) setMuteButton();
    else setUnmuteButton();
  }
  if (videoTrack) {
    if (videoTrack.enabled) setStopVideo();
    else setPlayVideo();
  }
});

document.getElementById("share_screen").addEventListener("click", async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Notify others about screen sharing
    socket.emit("start-screen-share");

    // Replace local video stream being sent to peers
    for (let userId in peers) {
      if (peers[userId] && peers[userId].peerConnection) {
        const sender = peers[userId].peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      }
    }

    // Replace local video display
    myvideo.srcObject = screenStream;

    screenTrack.onended = async () => {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const camTrack = camStream.getVideoTracks()[0];

        // Notify others that screen sharing stopped
        socket.emit("stop-screen-share");

        // Replace screen share with camera for all peers
        for (let userId in peers) {
          if (peers[userId] && peers[userId].peerConnection) {
            const sender = peers[userId].peerConnection
              .getSenders()
              .find((s) => s.track && s.track.kind === "video");
            if (sender) {
              sender.replaceTrack(camTrack);
            }
          }
        }

        // Replace local video display back to camera
        videoStream = camStream;
        myvideo.srcObject = camStream;
      } catch (err) {
        console.error("Failed to switch back to camera:", err);
      }
    };
  } catch (err) {
    console.error("Screen sharing failed:", err);
  }
});

// Listen for screen sharing events from other users
socket.on("screen-share-started", (userId) => {
  console.log(`User ${userId} started screen sharing`);
  // You can add visual indicators here
});

socket.on("screen-share-stopped", (userId) => {
  console.log(`User ${userId} stopped screen sharing`);
  // You can remove visual indicators here
});

const leaveMeeting = function () {
  console.log("Leaving meeting...");

  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
  }

  // Close all peer connections
  for (let userId in peers) {
    if (peers[userId]) {
      peers[userId].close();
    }
  }

  if (peer && peer.destroy) {
    peer.destroy();
  }

  if (socket && socket.disconnect) {
    socket.disconnect();
  }

  window.location.href = "/dashboard";
};
