import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '10px' }}>404 - Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>The requested resource does not exist.</p>
      <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
        Return to Home
      </Link>
    </div>
  );
}
