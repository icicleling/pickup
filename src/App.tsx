import { ChangeEvent, useEffect, useRef, useState } from "react";
import styled from "styled-components";

const BAR_TOTAL = 24;

function App() {
  const intervalNumberRef = useRef(0);
  const analyserNodeRef = useRef<AnalyserNode | undefined>(undefined);
  const dataArrayRef = useRef<Uint8Array>(new Uint8Array(0));
  const isCallInitRef = useRef(false);
  const screenLockRef = useRef<WakeLockSentinel>();

  const [isStart, setIsStart] = useState(false);
  const [isFirstStart, setIsFirstStart] = useState(true);
  const [volume, setVolume] = useState(0);
  const [showSidePanel, setShowSidePanel] = useState(false);

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
    if (!isStart) {
      intervalNumberRef.current = window.setInterval(refreshVolume, 100);
      setIsStart(true);
      return;
    }

    if (isFirstStart) setIsFirstStart(false);
    if (intervalNumberRef === undefined) return;
    window.clearInterval(intervalNumberRef.current);
    setIsStart(false);
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

  function handleToggleSidePanel() {
    setShowSidePanel(!showSidePanel);
  }

  useEffect(() => {
    if (isCallInitRef.current) return;
    init();
    isCallInitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBarNumber = Math.min(
    BAR_TOTAL,
    Math.floor(volume * (BAR_TOTAL / 100))
  );
  const barColorArr = Array.from(Array(activeBarNumber).keys()).map(
    (num) =>
      `hsl(${280 - 280 * ((activeBarNumber - num) / BAR_TOTAL)}, 80%, 60%)`
  );

  return (
    <Root>
      {!isStart && (
        <Header>
          <div onClick={fullScreen}>全屏</div>
          <div onClick={handleToggleSidePanel}>设置</div>
        </Header>
      )}
      <SidePanel $isActive={showSidePanel}>
        <PanelClose onClick={handleToggleSidePanel}>关闭</PanelClose>
        <InputRangeWrapper>
          <InputRange
            type="range"
            min={0}
            max={140}
            onChange={handleChangeRange}
          />
        </InputRangeWrapper>
        <PanelSettingTitle>灵敏度</PanelSettingTitle>
      </SidePanel>
      <MusicBarContainer>
        {barColorArr.map((color, index) => (
          <MusicBar key={index} $color={color}></MusicBar>
        ))}
      </MusicBarContainer>
      <StartMask onClick={handleClick}>
        {!isStart && isFirstStart && "点击开始"}
        {!isStart && !isFirstStart && "暂停"}
      </StartMask>
    </Root>
  );
}

const Root = styled.div`
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #282830;
  position: relative;
`;

const Header = styled.div`
  position: absolute;
  top: 0px;
  font-size: 22px;
  color: #fff;
  z-index: 1;
  opacity: 0.8;
  display: flex;
  width: 100%;
  padding: 12px;
  gap: 8px;
  justify-content: space-between;
`;

const SidePanel = styled.div<{ $isActive: boolean }>`
  position: fixed;
  width: 100vw;
  height: 100vh;
  background: #4a4f59;
  transition: left 0.5s ease;
  z-index: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  left: ${(props) => (props.$isActive ? 0 : "-100vw")};
  color: #ffffffaa;
`;

const PanelClose = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 22px;
`;

const PanelSettingTitle = styled.div`
  font-size: 32px;
  margin-top: 1em;
`;

const InputRangeWrapper = styled.div`
  position: relative;
  height: 20rem;
  width: 3rem;

  &::before,
  &::after {
    display: block;
    position: absolute;
    color: #fff;
    width: 100%;
    text-align: center;
    font-size: 1.5rem;
    line-height: 1;
    padding: 0.75rem 0;
    pointer-events: none;
  }
  &::before {
    content: "+";
  }
  &::after {
    content: "-";
    bottom: 0;
  }
`;

const InputRange = styled.input`
  -webkit-appearance: none;
  appearance: none;
  background-color: rgba(255, 255, 255, 0.2);
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  padding: 0;
  width: 20rem;
  height: 3.5rem;
  transform: translate(-50%, -50%) rotate(-90deg);
  border-radius: 1rem;
  overflow: hidden;
  cursor: row-resize;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0;
    box-shadow: -20rem 0 0 20rem rgba(255, 255, 255, 0.2);
  }
  &::-moz-range-thumb {
    border: none;
    width: 0;
    box-shadow: -20rem 0 0 20rem rgba(255, 255, 255, 0.2);
  }
`;

const MusicBarContainer = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const MusicBar = styled.div<{ $color: string }>`
  height: calc(100vh / ${BAR_TOTAL} - 4px);
  margin-top: 4px;
  background: ${(props) => props.$color};
`;

const StartMask = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  font-size: 42px;
  font-weight: bold;
  color: #fff;
  opacity: 0.8;
  user-select: none;
`;

export default App;
