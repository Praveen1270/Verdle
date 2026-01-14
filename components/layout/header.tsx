import Image from "next/image";
import React from "react";

export default function Header() {
  return (
    <div className="flex items-center justify-center gap-3 text-center">
      <Image
        src="/assets/verdle-icon.png"
        alt="crackmyword"
        width={44}
        height={44}
        priority
      />
      <div className="text-left">
        <div className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
          crackmyword – Guess Your Friend’s Secret Word
        </div>
      </div>
    </div>
  );
}
