const VIDEO_ID = "AlxNuMXkKqM";

const videoIntro = document.getElementById("videoIntro");
const mainLanding = document.getElementById("mainLanding");
const skipBtn = document.getElementById("skipVideo");
const iframe = document.getElementById("ytEmbed");

let transitioned = false;
let player = null;
let apiHooked = false;

const INTRO_VOLUME = 38;

function embedUrl() {
  const base = `https://www.youtube.com/embed/${VIDEO_ID}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1&autoplay=1&mute=0`;
  try {
    const { protocol, origin } = window.location;
    if (protocol === "http:" || protocol === "https:") {
      return `${base}&origin=${encodeURIComponent(origin)}`;
    }
  } catch {
    /* ignore */
  }
  return base;
}

function setIframeSrc() {
  if (iframe) iframe.src = embedUrl();
}

function goToLanding() {
  if (transitioned) return;
  transitioned = true;
  try {
    player?.destroy?.();
  } catch {
    /* ignore */
  }
  player = null;
  videoIntro?.classList.add("is-hidden");
  mainLanding?.classList.remove("is-hidden");
  requestAnimationFrame(() => {
    mainLanding?.classList.add("is-active");
  });
}

function hookPlayer() {
  if (apiHooked || !window.YT || !window.YT.Player || !iframe) return;
  apiHooked = true;
  player = new YT.Player("ytEmbed", {
    events: {
      onReady: (e) => {
        const p = e.target;
        try {
          p.unMute();
          p.setVolume(INTRO_VOLUME);
        } catch {
          /* ignore */
        }
      },
      onStateChange: (e) => {
        if (e.data === window.YT.PlayerState.ENDED) {
          goToLanding();
        }
      },
    },
  });
}

skipBtn?.addEventListener("click", goToLanding);

window.addEventListener("youtube-iframe-api-ready", hookPlayer);

setIframeSrc();

queueMicrotask(() => {
  if (window.YT && window.YT.Player) {
    hookPlayer();
  }
});

window.addEventListener("load", () => {
  if (window.YT && window.YT.Player) {
    hookPlayer();
  }
});
