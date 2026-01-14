"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "../ui/button";
import Image from "next/image";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GoogleSignIn(props: { next?: string; className?: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const next = props.next ? encodeURIComponent(props.next) : encodeURIComponent("/");
    await supabase.auth.signInWithOAuth({
      provider: "google",

      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${next}`,
      },
    });
  };

  return (
    <Button
      variant="default"
      className={cn(
        "select-none flex flex-row gap-3 w-full items-center justify-center rounded-xl border border-white bg-white text-black hover:bg-white/90 hover:text-black focus-visible:text-black",
        props.className
      )}
      onClick={handleLogin}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin text-black/70" />
      ) : (
        <Image
          src="/assets/google.png"
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          priority
        />
      )}
      Continue with Google
    </Button>
  );
}
