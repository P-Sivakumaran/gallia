import Link from 'next/link'
import styles from './GalliaLogo.module.css'

export default function GalliaLogo() {
  return (
    <Link href="/" className={styles.wordmark} aria-label="Gallia home">
      <span className={styles.lockup} aria-hidden="true">
        <span className={styles.mark}>
          <svg className={styles.frame} viewBox="0 0 33 36" fill="none" focusable="false">
            <path d="M2.5.5h28a2 2 0 0 1 2 2v21a12 12 0 0 1-12 12h-18a2 2 0 0 1-2-2v-31a2 2 0 0 1 2-2Z" pathLength="100" />
          </svg>
          <span className={styles.initial}>G</span>
        </span>
        <span className={styles.name}>
          {'ALLIA'.split('').map((letter, index) => (
            <span className={styles.letter} style={{ animationDelay: `${240 + index * 55}ms` }} key={`${letter}-${index}`}>{letter}</span>
          ))}
        </span>
        <span className={styles.dot} />
      </span>
    </Link>
  )
}
