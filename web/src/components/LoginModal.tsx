import React, { useState } from 'react';
import {
  X,
  Lock,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  Shield,
  Eye,
  LogIn,
  AlertCircle
} from 'lucide-react';
import type { AppUser, UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  onGoogleLogin: () => Promise<any>;
}

export const DEMO_ACCOUNTS: Array<{
  username: string;
  email: string;
  role: UserRole;
  name: string;
  pass: string;
  badgeColor: string;
  desc: string;
}> = [
  {
    username: 'admin',
    email: 'admin@garden.io',
    role: 'ADMIN',
    name: 'Admin Phát',
    pass: 'admin',
    badgeColor: '#f87171',
    desc: 'Toàn quyền quản trị: Bật/tắt bơm, cấu hình ngưỡng NVS, phân quyền tài khoản'
  },
  {
    username: 'operator',
    email: 'operator@garden.io',
    role: 'OPERATOR',
    name: 'Kỹ Thuật Viên Vận Hành',
    pass: 'operator',
    badgeColor: '#fbbf24',
    desc: 'Quyền vận hành: Điều khiển bơm tay, đổi chế độ AUTO/MAN, gỡ khóa khẩn cấp'
  },
  {
    username: 'viewer',
    email: 'viewer@garden.io',
    role: 'VIEWER',
    name: 'Khách Giám Sát',
    pass: 'viewer',
    badgeColor: '#38bdf8',
    desc: 'Chế độ giám sát: Chỉ xem số liệu trực quan, biểu đồ thời gian thực, không thể điều khiển'
  }
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onGoogleLogin
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const inputId = identifier.trim().toLowerCase();
    const inputPass = password.trim();

    if (!inputId || !inputPass) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.');
      return;
    }

    // Kiểm tra với danh sách tài khoản demo
    const match = DEMO_ACCOUNTS.find(
      (acc) =>
        acc.username.toLowerCase() === inputId ||
        acc.email.toLowerCase() === inputId
    );

    if (match) {
      if (
        inputPass === match.pass ||
        inputPass === match.username
      ) {
        const appUser: AppUser = {
          uid: `user-${match.username}-${Date.now()}`,
          email: match.email,
          displayName: match.name,
          role: match.role
        };
        onLoginSuccess(appUser);
        onClose();
        return;
      } else {
        setErrorMsg(`Mật khẩu không chính xác. Mật khẩu cho tài khoản "${match.username}" là: "${match.pass}"`);
        return;
      }
    }

    // Nếu là tài khoản tùy ý nhập khác: mật khẩu trùng username
    if (inputPass === inputId) {
      const isOperator = inputId.includes('oper') || inputId.includes('kythuat');
      const isAdmin = inputId.includes('admin') || inputId.includes('phat');
      const role: UserRole = isAdmin ? 'ADMIN' : isOperator ? 'OPERATOR' : 'VIEWER';

      const appUser: AppUser = {
        uid: `user-custom-${Date.now()}`,
        email: inputId.includes('@') ? inputId : `${inputId}@garden.io`,
        displayName: inputId.includes('@') ? inputId.split('@')[0] : inputId,
        role
      };
      onLoginSuccess(appUser);
      onClose();
    } else {
      setErrorMsg(`Mật khẩu không đúng. Vui lòng nhập mật khẩu trùng tên đăng nhập: "${inputId}"`);
    }
  };

  const handleQuickLogin = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setErrorMsg('');
    const appUser: AppUser = {
      uid: `user-${acc.username}-${Date.now()}`,
      email: acc.email,
      displayName: acc.name,
      role: acc.role
    };
    onLoginSuccess(appUser);
    onClose();
  };

  const handleGoogleClick = async () => {
    setErrorMsg('');
    try {
      setLoading(true);
      await onGoogleLogin();
      onClose();
    } catch (err: any) {
      setErrorMsg('Lỗi đăng nhập Google: ' + (err.message || 'Hủy đăng nhập'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#071610',
        border: '1px solid rgba(82, 183, 136, 0.25)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(82, 183, 136, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(82, 183, 136, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0a1d15'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(82, 183, 136, 0.15)',
              color: '#52b788',
              display: 'flex'
            }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#eef5f0' }}>
                Đăng Nhập Hệ Thống
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#8fa89b' }}>
                Xác thực phân quyền quản lý & điều khiển thiết bị
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8fa89b',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form đăng nhập Username & Password */}
          <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#c9dcd0', marginBottom: '6px' }}>
                Tên đăng nhập / Email
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6e8d7d', display: 'flex' }}>
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  placeholder="admin, operator, viewer hoặc email..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    backgroundColor: '#05100c',
                    border: '1px solid rgba(82, 183, 136, 0.25)',
                    borderRadius: '8px',
                    color: '#eef5f0',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#c9dcd0', marginBottom: '6px' }}>
                Mật khẩu (Trùng với Tên đăng nhập: admin / operator / viewer)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6e8d7d', display: 'flex' }}>
                  <KeyRound size={16} />
                </span>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu (admin / operator / viewer)..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    backgroundColor: '#05100c',
                    border: '1px solid rgba(82, 183, 136, 0.25)',
                    borderRadius: '8px',
                    color: '#eef5f0',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: '4px',
                padding: '11px',
                backgroundColor: '#52b788',
                color: '#071610',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(82, 183, 136, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <LogIn size={16} />
              <span>Đăng Nhập</span>
            </button>
          </form>

          {/* Phân cách */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '22px 0 16px 0',
            color: '#6e8d7d',
            fontSize: '11px'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(82, 183, 136, 0.15)' }} />
            <span style={{ padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Hoặc chọn nhanh theo 3 Role
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(82, 183, 136, 0.15)' }} />
          </div>

          {/* 3 Nút Đăng nhập nhanh theo Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickLogin(acc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#091c14',
                  border: `1px solid ${acc.badgeColor}33`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    padding: '6px',
                    borderRadius: '6px',
                    backgroundColor: `${acc.badgeColor}22`,
                    color: acc.badgeColor,
                    display: 'flex'
                  }}>
                    {acc.role === 'ADMIN' ? (
                      <ShieldCheck size={16} />
                    ) : acc.role === 'OPERATOR' ? (
                      <Shield size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#eef5f0' }}>
                      {acc.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8fa89b' }}>
                      user: <code style={{ color: '#74c69d' }}>{acc.username}</code> • pass: <code style={{ color: '#74c69d' }}>{acc.pass}</code>
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: `${acc.badgeColor}25`,
                  color: acc.badgeColor,
                  fontFamily: 'var(--font-mono)'
                }}>
                  {acc.role}
                </span>
              </button>
            ))}
          </div>

          {/* Đăng nhập bằng Google */}
          <div style={{ marginTop: '18px' }}>
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0d2219',
                border: '1px solid rgba(82, 183, 136, 0.3)',
                borderRadius: '8px',
                color: '#eef5f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
