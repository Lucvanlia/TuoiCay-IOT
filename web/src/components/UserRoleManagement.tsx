import React, { useState } from 'react';
import {
  ShieldCheck,
  Shield,
  UserCheck,
  Eye,
  Plus,
  Trash2,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { UserRole, UserPermissionItem } from '../types';

interface UserRoleManagementProps {
  currentUser: User | null;
  currentUserRole: UserRole;
  rolesList: UserPermissionItem[];
  onSetRole: (email: string, role: UserRole, displayName?: string) => Promise<void>;
  onRemoveRole: (id: string) => Promise<void>;
  onLogin: () => void;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  currentUser,
  currentUserRole,
  rolesList,
  onSetRole,
  onRemoveRole,
  onLogin
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('OPERATOR');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentUserRole === 'ADMIN';

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
      return;
    }

    try {
      setSubmitting(true);
      await onSetRole(newEmail.trim().toLowerCase(), selectedRole);
      setFeedback({
        type: 'success',
        message: `Đã cấp quyền ${selectedRole} thành công cho ${newEmail.trim()}!`
      });
      setNewEmail('');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Lỗi lưu phân quyền: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          }}>
            👑 ADMIN (Toàn quyền)
          </span>
        );
      case 'OPERATOR':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          }}>
            🛠️ OPERATOR (Vận hành)
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)'
          }}>
            👀 VIEWER (Chỉ xem)
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(82, 183, 136, 0.15)',
            border: '1px solid #52b788',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#74c69d'
          }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#eef5f0', margin: 0 }}>
              Quản Trị Phân Quyền Người Dùng (Firebase RBAC)
            </h2>
            <p style={{ fontSize: '13px', color: '#8fa89b', margin: '4px 0 0 0' }}>
              Kiểm soát quyền truy cập theo mô hình Role-Based Access Control, bảo vệ trạm bơm tưới khỏi thao tác trái phép.
            </p>
          </div>
        </div>

        {/* Current User Pill */}
        {currentUser ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            borderRadius: '12px',
            backgroundColor: '#0a1d15',
            border: '1px solid rgba(82, 183, 136, 0.25)'
          }}>
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#1b4332',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#74c69d',
                fontWeight: 700
              }}>
                {(currentUser.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                {currentUser.displayName || currentUser.email}
              </div>
              <div style={{ marginTop: '2px' }}>
                {getRoleBadge(currentUserRole)}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#1b4332',
              color: '#74c69d',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <LogIn size={16} />
            <span>Đăng nhập để nhận quyền</span>
          </button>
        )}
      </div>

      {/* 2. Three Role Cards (RBAC Matrix) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {/* Admin Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Shield size={22} color="#ef4444" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eef5f0', margin: 0 }}>
              Quản Trị Viên (ADMIN)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#8fa89b', lineHeight: 1.5 }}>
            Toàn quyền quản trị hệ thống. Được điều khiển máy bơm, chỉnh ngưỡng độ ẩm/mưa, dừng khẩn cấp và cấp quyền cho người dùng khác.
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#74c69d', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Bật/Tắt Bơm</span>
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Đổi Ngưỡng</span>
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Phân Quyền</span>
          </div>
        </div>

        {/* Operator Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #fbbf24' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <UserCheck size={22} color="#fbbf24" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eef5f0', margin: 0 }}>
              Vận Hành Viên (OPERATOR)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#8fa89b', lineHeight: 1.5 }}>
            Dành cho người chăm sóc vườn. Được phép bật/tắt máy bơm thủ công và chuyển chế độ AUTO/MANUAL, nhưng không được sửa ngưỡng bảo vệ hay đổi vai trò.
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#fbbf24', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Bật/Tắt Bơm</span>
            <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Đổi Chế Độ</span>
          </div>
        </div>

        {/* Viewer Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Eye size={22} color="#38bdf8" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eef5f0', margin: 0 }}>
              Khách Giám Sát (VIEWER)
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#8fa89b', lineHeight: 1.5 }}>
            Chế độ mặc định an toàn cho khách hoặc tài khoản chưa xác thực. Chỉ được xem thông số cảm biến, biểu đồ và lịch sử; nút bấm điều khiển bị khóa.
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#38bdf8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Xem Telemetry</span>
            <span style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Xem Biểu Đồ</span>
          </div>
        </div>
      </div>

      {/* 3. Assign Role Form (Only for Admin or when empty) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eef5f0', marginBottom: '6px' }}>
          {isAdmin ? 'Cấp Quyền / Thêm Tài Khoản Mới' : 'Cấp Quyền Tài Khoản (Yêu cầu quyền Admin)'}
        </h3>
        <p style={{ fontSize: '13px', color: '#8fa89b', marginBottom: '18px' }}>
          Nhập địa chỉ Email Google của thành viên nhóm hoặc người vận hành vườn để gán vai trò truy cập tương ứng.
        </p>

        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            backgroundColor: feedback.type === 'success' ? 'rgba(82, 183, 136, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#52b788' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#74c69d' : '#f87171',
            fontSize: '13px'
          }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleAssignRole} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Ví dụ: thanhvien@gmail.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={!isAdmin && rolesList.length > 0}
            style={{
              flex: '1 1 280px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(82, 183, 136, 0.25)',
              backgroundColor: '#0a1d15',
              color: '#eef5f0',
              fontSize: '14px',
              outline: 'none'
            }}
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            disabled={!isAdmin && rolesList.length > 0}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(82, 183, 136, 0.25)',
              backgroundColor: '#0a1d15',
              color: '#eef5f0',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ADMIN">👑 ADMIN (Toàn quyền)</option>
            <option value="OPERATOR">🛠️ OPERATOR (Vận hành)</option>
            <option value="VIEWER">👀 VIEWER (Chỉ xem)</option>
          </select>

          <button
            type="submit"
            disabled={submitting || (!isAdmin && rolesList.length > 0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isAdmin || rolesList.length === 0 ? '#1b4332' : 'rgba(255,255,255,0.05)',
              color: isAdmin || rolesList.length === 0 ? '#74c69d' : '#6b8a7b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isAdmin || rolesList.length === 0 ? 'pointer' : 'not-allowed'
            }}
          >
            {isAdmin || rolesList.length === 0 ? <Plus size={18} /> : <Lock size={18} />}
            <span>{submitting ? 'Đang lưu...' : 'Lưu quyền'}</span>
          </button>
        </form>
      </div>

      {/* 4. Configured Users Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#eef5f0', margin: 0 }}>
              Danh Sách Người Dùng Được Cấp Quyền ({rolesList.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#8fa89b', margin: '4px 0 0 0' }}>
              Dữ liệu được lưu trữ trực tiếp trên Firebase Cloud Node <code>/garden/roles</code>.
            </p>
          </div>
        </div>

        {rolesList.length === 0 ? (
          <div style={{
            padding: '36px',
            textAlign: 'center',
            color: '#6e8d7d',
            backgroundColor: '#081710',
            borderRadius: '10px',
            border: '1px dashed rgba(82, 183, 136, 0.2)'
          }}>
            <Sparkles size={28} color="#52b788" style={{ marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#eef5f0' }}>Chưa có tài khoản nào được cấu hình trong hệ thống.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Tài khoản đầu tiên đăng nhập hoặc được thêm ở trên sẽ mặc định là ADMIN.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(82, 183, 136, 0.15)', color: '#8fa89b', fontSize: '12px' }}>
                  <th style={{ padding: '12px 14px' }}>Người dùng</th>
                  <th style={{ padding: '12px 14px' }}>Vai trò (Role)</th>
                  <th style={{ padding: '12px 14px' }}>Ngày cấp quyền</th>
                  <th style={{ padding: '12px 14px' }}>Người cấp</th>
                  {isAdmin && <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {rolesList.map((item) => {
                  const isCurrent = currentUser?.email?.toLowerCase() === item.email.toLowerCase();
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(82, 183, 136, 0.08)',
                        backgroundColor: isCurrent ? 'rgba(82, 183, 136, 0.06)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#16382a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#74c69d',
                            fontWeight: 700,
                            fontSize: '13px'
                          }}>
                            {item.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#eef5f0' }}>
                              {item.displayName || item.email.split('@')[0]}
                              {isCurrent && (
                                <span style={{
                                  marginLeft: '8px',
                                  fontSize: '10px',
                                  color: '#52b788',
                                  backgroundColor: 'rgba(82, 183, 136, 0.15)',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  (Bạn)
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6e8d7d' }}>{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        {getRoleBadge(item.role)}
                      </td>
                      <td style={{ padding: '14px', fontSize: '12px', color: '#8fa89b', fontFamily: 'var(--font-mono)' }}>
                        {item.addedAt || '--'}
                      </td>
                      <td style={{ padding: '14px', fontSize: '12px', color: '#8fa89b' }}>
                        {item.addedBy || 'Hệ thống'}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button
                            onClick={() => onRemoveRole(item.id)}
                            title="Xóa quyền người dùng"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#f87171',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
