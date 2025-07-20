const socket = io();

const videoGrid = document.getElementById("video-grid");
const myvideo = document.createElement("video");
myvideo.muted = true;

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: location.protocol === "https:" ? 443 : 3030,
});

let videoStream;
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

    socket.on("user-connected", (userid) => {
      setTimeout(() => {
        connectToNewUser(userid, videoStream);
      }, 1000); // short delay ensures the new peer is ready
    });

    let txt = $("input");

    $("html").keydown((event) => {
      if (event.which == 13 && txt.val().length !== 0) {
        console.log(txt.val());
        socket.emit("message", txt.val());
        txt.val("");
      }
    });

    socket.on("createMessage", (msg) => {
      $(".messages").append(`<li class= "msg"><b>user</b> <br> ${msg}</li>`);
    });
    scrollBottom();
  });

peer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

const connectToNewUser = function (userid, stream) {
  const call = peer.call(userid, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
};

const addVideoStream = function (video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
};

const scrollBottom = function () {
  let div = $(".main_chat_window");
  div.scrollTop(div.prop("scrollHeight"));
};

const muteUnmute = function () {
  const enabled = videoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    videoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    videoStream.getAudioTracks()[0].enabled = true;
  }
};

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `;
  document.querySelector(".main_mute_button").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `;
  document.querySelector(".main_mute_button").innerHTML = html;
};

const playStop = function () {
  console.log("object");
  let enabled = videoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    videoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    videoStream.getVideoTracks()[0].enabled = true;
  }
};

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video "></i>
    <span>Stop Video</span>
  `;
  document.querySelector(".main_video_button").innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Start Video</span>
  `;
  document.querySelector(".main_video_button").innerHTML = html;
};

document.getElementById("share_screen").addEventListener("click", async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    // Replace local video stream being sent to peers
    for (let connId in peer.connections) {
      peer.connections[connId].forEach((conn) => {
        const sender = conn.peerConnection
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });
    }
    const screenVideo = document.createElement("video");
    screenVideo.srcObject = screenStream;
    screenVideo.classList.add("screen-share-video");
    screenVideo.addEventListener("loadedmetadata", () => screenVideo.play());
    videoGrid.appendChild(screenVideo);

    screenTrack.onended = async () => {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const camTrack = camStream.getVideoTracks()[0];

      for (let connId in peer.connections) {
        peer.connections[connId].forEach((conn) => {
          const sender = conn.peerConnection
            .getSenders()
            .find((s) => s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(camTrack);
          }
        });
      }

      screenVideo.remove();
    };
  } catch (err) {
    console.error("Screen sharing failed:", err);
  }
});

const leaveMeeting = function () {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
  }
  if (peer && peer.destroy) {
    peer.destroy();
  }
  if (socket && socket.disconnect) {
    socket.disconnect();
  }
  window.location.href = "/";
};
