import { forwardRef } from 'react'

// Procedural hero ship: swept-wing smuggler. Same hull shared by player,
// traffic and police — palette props differentiate them.
export const Ship = forwardRef(function Ship(
  { body = '#101014', accent = '#ff7a00', glass = '#7fd4ff', engine = '#41d6ff', scale = 1, children, ...rest },
  ref,
) {
  return (
    <group ref={ref} scale={scale} {...rest}>
      {/* fuselage */}
      <mesh rotation-x={Math.PI / 2}>
        <capsuleGeometry args={[3.2, 14, 6, 16]} />
        <meshStandardMaterial color={body} metalness={0.85} roughness={0.32} />
      </mesh>
      {/* nose */}
      <mesh position={[0, 0, -12.5]} rotation-x={-Math.PI / 2}>
        <coneGeometry args={[2.4, 7, 16]} />
        <meshStandardMaterial color={accent} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* cockpit canopy */}
      <mesh position={[0, 2.6, -3]} scale={[1, 0.8, 1.5]}>
        <sphereGeometry args={[2.4, 16, 12]} />
        <meshPhysicalMaterial color={glass} metalness={0.1} roughness={0.05} transparent opacity={0.75} />
      </mesh>
      {/* swept wings */}
      <mesh position={[8, 0, 4.5]} rotation-y={-0.5}>
        <boxGeometry args={[15, 0.7, 6]} />
        <meshStandardMaterial color={accent} metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[-8, 0, 4.5]} rotation-y={0.5}>
        <boxGeometry args={[15, 0.7, 6]} />
        <meshStandardMaterial color={accent} metalness={0.8} roughness={0.35} />
      </mesh>
      {/* tail fin */}
      <mesh position={[0, 3.5, 6.5]}>
        <boxGeometry args={[0.7, 6, 6]} />
        <meshStandardMaterial color={accent} metalness={0.8} roughness={0.35} />
      </mesh>
      {/* engine nacelles + exhaust */}
      {[-4.6, 4.6].map((x) => (
        <group key={x} position={[x, -0.4, 7]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[1.6, 1.95, 7, 12]} />
            <meshStandardMaterial color={body} metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0, 4.2]} name="exhaust">
            <sphereGeometry args={[1.45, 10, 8]} />
            <meshBasicMaterial color={engine} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* nav lights — port red, starboard green */}
      <mesh position={[14.8, 0, 7]} name="navL">
        <sphereGeometry args={[0.55, 8, 6]} />
        <meshBasicMaterial color="#ff2233" toneMapped={false} />
      </mesh>
      <mesh position={[-14.8, 0, 7]} name="navR">
        <sphereGeometry args={[0.55, 8, 6]} />
        <meshBasicMaterial color="#2bff77" toneMapped={false} />
      </mesh>
      {children}
    </group>
  )
})
