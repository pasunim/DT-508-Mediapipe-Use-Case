export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* SRI hashes prevent CDN-served script tampering (supply-chain attack mitigation) */}
      <script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        integrity="sha384-oHwoZ9HyKv5ark5VOH+XWdbNfmhYtptAOBuV8plz6mAfXvTA6d8fULuYllWouEK2"
        crossOrigin="anonymous"
        async
      />
      <script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        integrity="sha384-q1KhAZhJcJXr3zfC3Tz07pBqQSabwFIZhXlmlUAB8s0zk4ETWERkIKGBCFQ5Jc3e"
        crossOrigin="anonymous"
        async
      />
      <script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        integrity="sha384-W/7NVG2tfN12ld8faSFVOZ/W4UHFHze98GqEUPTl8EjY9QDwCKQIzoCHp8/IlIIr"
        crossOrigin="anonymous"
        async
      />
      {children}
    </>
  );
}
