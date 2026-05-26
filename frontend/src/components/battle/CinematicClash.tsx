"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { sounds } from "@/lib/sounds";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

// Preload the specific fast3d model immediately to prevent flashing
useGLTF.preload("/models/battle_scene.glb");

function Scene() {
  const { scene } = useGLTF("/models/battle_scene.glb");
  const modelRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    // Adding some white/grey mixed into the charcoal to make it pop more
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
         child.material = new THREE.MeshStandardMaterial({
           color: 0x555d66, // Lighter, grayish white/charcoal mix 
           roughness: 0.4,
           metalness: 0.5,
         });
      }
    });
  }, [scene]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (t < 14) {
      // Orbital camera pulled back further to show the full bodies
      state.camera.position.x = Math.sin(t * 0.15) * 6.5;
      state.camera.position.y = 1.0; 
      state.camera.position.z = Math.cos(t * 0.15) * 6.5;
      // Target the center
      state.camera.lookAt(0, 0, 0);
    } else if (t >= 14 && t <= 15) {
      // Violent zoom
      const progress = t - 14;
      state.camera.position.z -= progress * 2.0;
      state.camera.lookAt(0, progress * 0.5, 0);
    }
  });

  return (
    // Lowered the entire group slightly to balance the screen real estate
    <group ref={modelRef} position={[0, -0.4, 0]}>
      {/* ── Platform Base ── */}
      {/* Platform placed significantly lower to ensure the busts sit entirely on top without clipping */}
      <mesh position={[0, -1.1, 0]} receiveShadow>
        {/* scaled down platform radius */}
        <cylinderGeometry args={[2.0, 2.3, 0.2, 64]} />
        <meshStandardMaterial 
          color={0x090c10} 
          roughness={0.1} 
          metalness={0.8} 
        />
      </mesh>
      
      {/* ── Horizontal Ring Glow Accent ── */}
      <mesh position={[0, -0.99, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.7, 1.85, 64]} />
        <meshBasicMaterial color="#a8ff3e" side={THREE.DoubleSide} />
      </mesh>

      {/* Reduced scale of the fighters so they fit cleanly in the center */}
      <primitive object={scene} scale={[1.1, 1.1, 1.1]} position={[0, 0, 0]} />
    </group>
  );
}

export default function CinematicClash({ onComplete }: { onComplete: () => void }) {
  const [zooming, setZooming] = useState(false);

  useEffect(() => {
    sounds.battleClash();
    
    const zoomTimer = setTimeout(() => {
      setZooming(true);
    }, 14000);

    const finish = setTimeout(() => {
      onComplete();
    }, 15000);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(finish);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-kenyx-bg"
      initial={{ opacity: 1 }}
      animate={{ opacity: zooming ? 0 : 1 }}
      transition={{ duration: 1, ease: "easeIn" }}
      style={{ pointerEvents: "none" }}
    >
      <div className="absolute inset-0">
        {/* Brought camera closer to compensate for smaller scene */}
        <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[-5, 5, -5]} intensity={8} color="#a8ff3e" />
          <directionalLight position={[5, 3, 5]} intensity={3} color="#ffffff" />
          <directionalLight position={[0, -2, 4]} intensity={1.5} color="#ffffff" />
          <Scene />
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* ── Giant Animating Cinematic Typography ── */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-start pt-[8vh] z-10 font-black italic tracking-tighter drop-shadow-2xl" 
        style={{ fontSize: "clamp(2rem, 7vw, 7rem)", lineHeight: 0.9 }}
      >
        {/* TEXT 1: Arrives from left at 1s */}
        <motion.div
           initial={{ x: "-100vw", opacity: 0 }}
           animate={{ x: ["-100vw", "0vw", "0vw", "-100vw"], opacity: [0, 1, 1, 0] }}
           transition={{ duration: 12.5, times: [0, 0.05, 0.95, 1], delay: 1 }}
           className="text-white text-center"
        >
          RACE TO
        </motion.div>
        
        {/* TEXT 2: Arrives from right slightly later at 2.5s */}
        <motion.div
           initial={{ x: "100vw", opacity: 0 }}
           animate={{ x: ["100vw", "0vw", "0vw", "100vw"], opacity: [0, 1, 1, 0] }}
           transition={{ duration: 11, times: [0, 0.08, 0.92, 1], delay: 2.5 }}
           style={{ color: "#a8ff3e" }}
           className="text-center"
        >
          SOLVE
        </motion.div>
      </div>

      {zooming && (
         <motion.div
           className="absolute rounded-full z-50 mix-blend-screen"
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: [0, 15], opacity: [0, 1, 0] }}
           transition={{ duration: 1, ease: "easeOut" }}
           style={{
             width: "20vw",
             height: "20vw",
             backgroundColor: "#a8ff3e",
             boxShadow: "0 0 200px 150px #a8ff3e",
           }}
         />
      )}
    </motion.div>
  );
}
