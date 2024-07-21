import { ChangeEvent, useEffect, useRef, useState } from "react";

function App() {
  const [buttonText, setButtonText] = useState<"Start" | "Stop">("Start");
  const [volume, setVolume] = useState(0);
  const intervalNumberRef = useRef(0);
  const analyserNodeRef = useRef<AnalyserNode | undefined>(undefined);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(0));
  const isCallInitRef = useRef(false);
  const screenLockRef = useRef<WakeLockSentinel>();

  function keepAwake() {
    if (!("wakeLock" in navigator)) return;
    function getScreenLock() {
      navigator.wakeLock.request("screen").then((lock) => {
        screenLockRef.current = lock;
      });
    }

    getScreenLock();

    document.addEventListener("visibilitychange", () => {
      if (
        screenLockRef.current !== null &&
        document.visibilityState === "visible"
      ) {
        getScreenLock();
      }
    });
  }

  function fullScreen() {
    document.querySelector("html")?.requestFullscreen();
  }

  function initAudio() {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      // .getDisplayMedia({ audio: true })
      .then((stream) => {
        const audioContext = new AudioContext();
        const mediaStreamNode = audioContext.createMediaStreamSource(stream);
        const analyserNode = audioContext.createAnalyser();
        mediaStreamNode.connect(analyserNode);
        analyserNode.fftSize = 64;
        analyserNode.smoothingTimeConstant = 0.1;
        const fftSize = analyserNode.fftSize;
        analyserNodeRef.current = analyserNode;
        const dataArray = new Uint8Array(fftSize);
        dataArrayRef.current = dataArray;
      });
  }

  function init() {
    keepAwake();
    initAudio();
  }

  function refreshVolume() {
    const dataArray = dataArrayRef.current;
    const analyserNode = analyserNodeRef.current!;
    analyserNode.getByteFrequencyData(dataArray);

    let sumSquares = 0.0;
    for (const amplitude of dataArray) {
      sumSquares += amplitude * amplitude;
    }

    const volumeValue = Math.sqrt(sumSquares / dataArray.length);
    setVolume(volumeValue);
  }

  function handleClick() {
    if (buttonText === "Start") {
      intervalNumberRef.current = window.setInterval(refreshVolume, 100);
      setButtonText("Stop");
      return;
    }
    if (buttonText === "Stop") {
      if (intervalNumberRef === undefined) return;
      setVolume(0);
      window.clearInterval(intervalNumberRef.current);
      setButtonText("Start");
    }
  }

  function handleChangeRange(e: ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value) - 50;

    if (!analyserNodeRef.current) return;
    if (value === 0) {
      analyserNodeRef.current.minDecibels = -100;
      analyserNodeRef.current.maxDecibels = 0;
      return;
    }
    if (value > 0) {
      analyserNodeRef.current.maxDecibels = 0 - value;
      return;
    }
    if (value < 0) {
      analyserNodeRef.current.minDecibels = -100 - value;
    }
  }

  useEffect(() => {
    if (isCallInitRef.current) return;
    init();
    isCallInitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BAR_TOTAL = 20;
  const activeBarNumber = Math.min(
    BAR_TOTAL,
    Math.floor(volume * (BAR_TOTAL / 100))
  );
  const barColorArray = Array.from(Array(activeBarNumber).keys()).map(
    (num) =>
      `hsl(${280 - 280 * ((activeBarNumber - num) / BAR_TOTAL)}, 80%, 60%)`
  );

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#282830",
        color: "#fff",
      }}
    >
      <div
        style={{
          height: "500px",
          width: "120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {barColorArray.map((color, index) => (
          <div
            key={index}
            style={{
              height: `calc(500px / ${BAR_TOTAL} - 4px)`,
              background: color,
              marginTop: "4px",
            }}
          ></div>
        ))}
      </div>
      <div>
        {activeBarNumber},{analyserNodeRef.current?.maxDecibels},
        {analyserNodeRef.current?.minDecibels}
      </div>
      <div>{volume}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleClick}>{buttonText}</button>
        <button onClick={fullScreen}>全屏</button>
      </div>
      <input type="range" max={140} min={0} onChange={handleChangeRange} />
    </div>
  );
}

export default App;
