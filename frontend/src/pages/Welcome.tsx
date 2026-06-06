import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const handleProceed = () => {
    if (token && user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #020617 100%)',
        color: '#F8FAFC',
        fontFamily: 'var(--font-sans)',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
          top: '10%',
          left: '15%',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
          bottom: '10%',
          right: '10%',
          zIndex: 1,
        }}
      />

      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          zIndex: 2,
          animation: 'slide-in 0.5s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '2rem',
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#3B82F6',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            National Security Grade Infrastructure
          </div>
        </div>

        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: '1.2',
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
          }}
        >
          Web PKI Management Console
        </h1>

        <p
          style={{
            fontSize: '1.125rem',
            color: '#94A3B8',
            maxWidth: '600px',
            margin: '0 auto 2.5rem auto',
            lineHeight: '1.6',
          }}
        >
          Centralized orchestrations for root trust anchors, intermediate issuing CAs, key generation vectors, active revocations, and hardware token bindings.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            marginBottom: '3rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>👑</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.25rem' }}>Trust Anchors</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4' }}>
              Initialize Root CAs and issuing intermediates safely protected inside database envelopes and SoftHSM layers.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔑</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.25rem' }}>Lifecycle Control</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4' }}>
              Generate software key pairs, issue certificate signing requests, and sign operations with precise validity controls.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.25rem' }}>Compliance & Audit</h4>
            <p style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: '1.4' }}>
              Track real-time security logs, verify signature chains, and query active OCSP status lookups immediately.
            </p>
          </div>
        </div>

        <button
          onClick={handleProceed}
          className="btn-primary"
          style={{
             backgroundColor: '#031339',
             color: '#ffffff',                  // White text
  border: '1px solid #00d4ff',
            padding: '0.85rem 2.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '0.5rem',
            boxShadow: '0 4px 14px rgba(0, 212, 255, 0.3)', // Optional: Add a matching blue glow
            transition: 'all 0.3s ease'
          }}
        >
          {token && user ? 'Enter Management Console' : 'Proceed to Authentication'}
        </button>
      </div>
    </div>
  );
};
