import { useEffect, useState } from "react";
import Confetti from "react-confetti";

// Components
import Builder from "@/components/Builder";
import QA from "@/components/QA";
import PopularWheels from "@/components/PopularWheels";
import BlogTeasers from "@/components/BlogTeasers";
import SEOFAQSchema from "@/components/SEOFAQSchema";
import {
  doc,
  onSnapshot,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/firebase";
/******************** Utilities ********************/
import { load, save } from "@/utils";
import { type User } from 'firebase/auth';

// Global live spin counter (local demo)
const useTotalSpins = () => {
  const [n, setN] = useState(() => load("qw_total_spins", 0));
  useEffect(() => {
    const h = () => setN(load("qw_total_spins", 0));
    window.addEventListener("qw:spins", h);
    return () => window.removeEventListener("qw:spins", h);
  }, []);
  return n;
};

// Utility function to increment local spin count
const incrementLocalSpins = () => {
  const current = load("qw_total_spins", 0);
  const newCount = current + 1;
  save("qw_total_spins", newCount);
  // Dispatch event to update the counter display
  window.dispatchEvent(new CustomEvent("qw:spins"));
  return newCount;
};

// Utility function to sync local spins to Firebase when user logs in
const syncLocalSpinsToFirebase = async (user: User) => {
  const localSpins = load("qw_total_spins", 0);
  if (localSpins > 0) {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        spinsCount: increment(localSpins),
      });
      // Clear local spins after successful sync
      save("qw_total_spins", 0);
      window.dispatchEvent(new CustomEvent("qw:spins"));
      console.log(`Synced ${localSpins} local spins to Firebase`);
    } catch (error) {
      console.error("Error syncing local spins to Firebase:", error);
    }
  }
};

/******************** App ********************/
export default function Home({ user }: { user: User | null}) {
  const total = useTotalSpins();
  const [display, setDisplay] = useState(total);

  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [userSpins, setUserSpins] = useState<number | null>(null);
  const [hasUserChanged, setHasUserChanged] = useState(false);

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let start = display,
      diff = total - start;
    if (!diff) return;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplay(Math.round(start + diff * (step / 25)));
      if (step >= 25) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [total]);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserSpins(docSnap.data().spinsCount || 0);
        } else {
          setUserSpins(0);
        }
      });
      return () => unsubscribe();
    } else {
      setUserSpins(null);
    }
  }, [user]);

  // Sync local spins to Firebase when user logs in
  useEffect(() => {
    if (user && hasUserChanged) {
      syncLocalSpinsToFirebase(user);
      setHasUserChanged(false);
    } else if (!user && hasUserChanged) {
      setHasUserChanged(false);
    }
  }, [user, hasUserChanged]);

  // Track user login/logout changes
  useEffect(() => {
    setHasUserChanged(true);
  }, [user?.uid]);


  return (
    <div
      id="top"
      className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-rose-50 text-slate-800"
    >
      
      <section className="text-center py-10">
        <h1 className="text-4xl font-extrabold text-slate-900">
          Create My Own Wheel
        </h1>
        <p className="text-slate-600 text-lg mt-2">
          Or choose from many of our popular wheels
        </p>
        <div className="mt-4 inline-block px-6 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-2xl rounded-full shadow-lg animate-pulse relative">
          🎉 {user ? userSpins?.toLocaleString() : display.toLocaleString()} Spins Played! 🎉
          <div className="absolute -top-2 -right-2 bg-amber-400 w-4 h-4 rounded-full animate-ping"></div>
        </div>
        <p className="text-slate-500 text-sm mt-2">and counting...</p>
      </section>

      <main className="max-w-7xl mx-auto px-2 md:px-6">
        <Builder
          showConfetti={showConfetti}
          setShowConfetti={setShowConfetti}
          user={user}
          onLocalSpin={incrementLocalSpins}
        />
        <PopularWheels />
        <BlogTeasers />
        <QA />
      </main>
      <SEOFAQSchema />

      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={1800} // more than default (200)
          gravity={0.5} // falls slower
          recycle={false}
          tweenDuration={8000}
        />
      )}
    </div>
  );
}
