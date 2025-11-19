import { useEffect, useRef } from "react";

type StarImageProps = {
  src: string;
};

export default function StarImage({ src }: StarImageProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const forced = document.createElement("div");
    forced.className = "starPoint";
    forced.style.left = "6%";
    forced.style.top = "6%";
    forced.style.animationDuration = "1.2s";
    box.appendChild(forced);

    for (let i = 0; i < 7; i++) {
      const s = document.createElement("div");
      s.className = "starPoint";

      let x;
      let y;

      do {
        x = Math.random() * 100;
        y = Math.random() * 100;
      } while (x < 25 && y < 25);

      const d = 0.8 + Math.random() * 1.6;

      s.style.left = x + "%";
      s.style.top = y + "%";
      s.style.animationDuration = d + "s";

      box.appendChild(s);
    }
  }, []);

  return (
    <div ref={boxRef} className="starWrap">
      <img src={src} className="w-40 h-40 rounded-[20px]" />
    </div>
  );
}
