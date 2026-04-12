import { motion } from 'framer-motion'

export function VoiceWave({ bars = [], active = false }) {
  return (
    <div className="flex h-8 items-center justify-center gap-[3px]">
      {bars.map((value, index) => (
        <motion.span
          key={index}
          animate={{
            height: active ? `${Math.max(4, value * 28)}px` : '4px',
            opacity: active ? 0.85 : 0.3,
          }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="w-[2.5px] rounded-full bg-accent"
        />
      ))}
    </div>
  )
}
