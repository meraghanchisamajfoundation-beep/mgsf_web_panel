"use client";

import {
    collection, getDocs, doc, updateDoc, deleteDoc,
    query, orderBy, addDoc,
} from "firebase/firestore";
import React, { useState, useEffect } from "react";
import {
    Table, Card, Avatar, Tag, Space, Button, Modal, Form, Input,
    Select, message, Popconfirm, Typography, Row, Col, Statistic,
    Tooltip, Switch, Badge, Drawer, Tabs, Alert, Checkbox, Divider,
    Progress, Empty, Spin,
} from "antd";
import {
    UserOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
    PlusOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined,
    TeamOutlined, UserAddOutlined, LockOutlined, KeyOutlined,
    EyeOutlined, EyeInvisibleOutlined, DownloadOutlined, SafetyOutlined,
    SafetyCertificateOutlined, SettingOutlined, AppstoreOutlined,
    BankOutlined, FileTextOutlined, TransactionOutlined, DashboardOutlined,
    UserSwitchOutlined, CrownOutlined, ApartmentOutlined,
} from "@ant-design/icons";

import { db } from "@/lib/firebase";
import api from "@/services/api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// ─── Permission Definitions ───────────────────────────────────────────────────
const SCREENS = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { key: "members", label: "Members", icon: <TeamOutlined /> },
    { key: "agents", label: "Agents", icon: <UserSwitchOutlined /> },
    { key: "yojnas", label: "Yojnas", icon: <ApartmentOutlined /> },
    { key: "requests", label: "Requests", icon: <FileTextOutlined /> },
    { key: "masters_users", label: "Masters › Users", icon: <UserOutlined /> },
    { key: "settings", label: "Settings", icon: <SettingOutlined /> },
    { key: "transactions", label: "Transactions", icon: <BankOutlined /> },
];

const ACTIONS = [
    { key: "view", label: "View", color: "#3b82f6" },
    { key: "edit", label: "Edit", color: "#f59e0b" },
    { key: "delete", label: "Delete", color: "#ef4444" },
    { key: "download", label: "Download", color: "#8b5cf6" },
];

const BUTTON_PERMISSIONS = [
    { key: "addYojna", label: "Add Yojna", screen: "yojnas" },
    { key: "addMembers", label: "Add Members", screen: "members" },
    { key: "addPayment", label: "Add Payment", screen: "transactions" },
    { key: "addAgents", label: "Add Agents", screen: "agents" },
];

const DEFAULT_PERMISSIONS = () => {
    const perms = {};
    SCREENS.forEach(s => {
        perms[s.key] = { view: false, edit: false, delete: false, download: false };
    });
    BUTTON_PERMISSIONS.forEach(b => {
        perms[b.key] = false;
    });
    return perms;
};

// ─── Inline Styles / Design Tokens (Light Mode) ─────────────────────────────────
const styles = {
    page: {
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "28px 32px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    headerCard: {
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
    },
    statCard: {
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        transition: "all 0.3s ease",
    },
    tableCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    primaryBtn: {
        background: "linear-gradient(135deg, #3b82f6, #2563eb)",
        border: "none",
        borderRadius: 10,
        fontWeight: 600,
        height: 40,
        boxShadow: "0 2px 4px rgba(59,130,246,0.2)",
    },
    ghostBtn: {
        borderRadius: 10,
        height: 40,
        borderColor: "#d1d5db",
        color: "#374151",
    },
    roleTag: (color) => ({
        borderRadius: 6,
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: 0.5,
        border: `1px solid ${color}30`,
        background: `${color}10`,
        color: color,
        padding: "2px 8px",
    }),
    drawerSection: {
        background: "#f8fafc",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        border: "1px solid #e2e8f0",
    },
    permRow: {
        display: "flex",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #e2e8f0",
    },
    screenLabel: {
        flex: 1,
        color: "#1e293b",
        fontSize: 13,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    actionChips: {
        display: "flex",
        gap: 6,
    },
};

// ─── Permission Matrix Component ─────────────────────────────────────────────
const PermissionMatrix = ({ permissions, onChange, readOnly = false }) => {
    const perms = permissions || DEFAULT_PERMISSIONS();

    const toggle = (screenKey, actionKey) => {
        if (readOnly) return;
        const updated = { ...perms, [screenKey]: { ...perms[screenKey], [actionKey]: !perms[screenKey]?.[actionKey] } };
        onChange?.(updated);
    };

    const toggleButton = (btnKey) => {
        if (readOnly) return;
        onChange?.({ ...perms, [btnKey]: !perms[btnKey] });
    };

    const toggleAll = (screenKey) => {
        if (readOnly) return;
        const allOn = ACTIONS.every(a => perms[screenKey]?.[a.key]);
        const updated = { ...perms };
        ACTIONS.forEach(a => { updated[screenKey] = { ...updated[screenKey], [a.key]: !allOn }; });
        onChange?.(updated);
    };

    return (
        <div>
            {/* Page Permissions */}
            <div style={{ marginBottom: 8, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Page Access & Actions
            </div>
            <div style={styles.drawerSection}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", padding: "0 0 10px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ flex: 1, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Screen</div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {ACTIONS.map(a => (
                            <div key={a.key} style={{ width: 68, textAlign: "center", color: a.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                                {a.label}
                            </div>
                        ))}
                        <div style={{ width: 50, textAlign: "center", color: "#64748b", fontSize: 11, fontWeight: 700 }}>All</div>
                    </div>
                </div>

                {SCREENS.map((screen) => {
                    const allOn = ACTIONS.every(a => perms[screen.key]?.[a.key]);
                    return (
                        <div key={screen.key} style={styles.permRow}>
                            <div style={styles.screenLabel}>
                                <span style={{ color: "#64748b", fontSize: 15 }}>{screen.icon}</span>
                                {screen.label}
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {ACTIONS.map(a => (
                                    <div key={a.key} style={{ width: 68, display: "flex", justifyContent: "center" }}>
                                        <div
                                            onClick={() => toggle(screen.key, a.key)}
                                            style={{
                                                width: 28, height: 28, borderRadius: 7,
                                                background: perms[screen.key]?.[a.key] ? `${a.color}15` : "#ffffff",
                                                border: perms[screen.key]?.[a.key] ? `1.5px solid ${a.color}` : "1.5px solid #d1d5db",
                                                cursor: readOnly ? "default" : "pointer",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                transition: "all 0.2s",
                                                fontSize: 13,
                                                color: perms[screen.key]?.[a.key] ? a.color : "#9ca3af",
                                            }}
                                        >
                                            {perms[screen.key]?.[a.key] ? "✓" : "–"}
                                        </div>
                                    </div>
                                ))}
                                <div style={{ width: 50, display: "flex", justifyContent: "center" }}>
                                    <Switch
                                        size="small"
                                        checked={allOn}
                                        onChange={() => toggleAll(screen.key)}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Button Permissions */}
            <div style={{ marginBottom: 8, color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Button Access
            </div>
            <div style={styles.drawerSection}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {BUTTON_PERMISSIONS.map(btn => {
                        const on = perms[btn.key];
                        return (
                            <div
                                key={btn.key}
                                onClick={() => toggleButton(btn.key)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 10,
                                    border: on ? "1.5px solid #3b82f6" : "1.5px solid #e2e8f0",
                                    background: on ? "#eff6ff" : "#ffffff",
                                    cursor: readOnly ? "default" : "pointer",
                                    color: on ? "#2563eb" : "#374151",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    transition: "all 0.2s",
                                    display: "flex", alignItems: "center", gap: 8,
                                }}
                            >
                                <span style={{ fontSize: 16 }}>{on ? "✓" : "+"}</span>
                                {btn.label}
                                <Text style={{ fontSize: 10, color: on ? "#6b7280" : "#9ca3af", display: "block" }}>
                                    [{btn.screen}]
                                </Text>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [permDrawerVisible, setPermDrawerVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [permUser, setPermUser] = useState(null);
    const [permData, setPermData] = useState(DEFAULT_PERMISSIONS());
    const [permSaving, setPermSaving] = useState(false);
    const [passwordUser, setPasswordUser] = useState(null);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState("1");

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    uid: data.uid,
                    email: data.email,
                    displayName: data.username || "No Name",
                    role: data.role || "user",
                    isSuperAdmin: data.isSuperAdmin || false,
                    status: data.status || "active",
                    disabled: data.disabled || false,
                    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                    lastUpdated: data.lastUpdated?.toDate?.() || new Date(data.lastUpdated),
                    photoURL: data.photoURL,
                    department: data.department,
                    eventId: data.eventId,
                    permissions: data.permissions || DEFAULT_PERMISSIONS(),
                };
            });
            setUsers(list);
        } catch (err) {
            console.error(err);
            message.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // ── Create ─────────────────────────────────────────────────────────────────
    const handleCreateUser = async (values) => {
        try {
            const resp = await api.post("/api/users/create", {
                email: values.email, password: values.password,
                displayName: values.displayName, role: values.role,
                eventId: values.eventId, department: values.department,
            });
            if (resp.data.success) {
                const userData = {
                    uid: resp.data.uid, email: values.email,
                    displayName: values.displayName, role: values.role,
                    isSuperAdmin: values.role === "superadmin",
                    status: "active", disabled: false,
                    department: values.department, eventId: values.eventId,
                    permissions: DEFAULT_PERMISSIONS(),
                    createdAt: new Date(), lastUpdated: new Date(),
                };
                await addDoc(collection(db, "users"), userData);
                message.success("User created successfully!");
                setCreateModalVisible(false);
                createForm.resetFields();
                fetchUsers();
            }
        } catch (err) {
            message.error(err.response?.data?.error || "Failed to create user");
        }
    };

    // ── Edit ───────────────────────────────────────────────────────────────────
    const handleEdit = (user) => {
        setEditingUser(user);
        editForm.setFieldsValue({
            displayName: user.displayName, email: user.email,
            role: user.role, status: user.status,
            isSuperAdmin: user.isSuperAdmin,
            department: user.department, eventId: user.eventId,
        });
        setEditModalVisible(true);
    };

    const handleUpdate = async (values) => {
        if (!editingUser) return;
        try {
            await updateDoc(doc(db, "users", editingUser.id), {
                displayName: values.displayName, role: values.role,
                status: values.status, isSuperAdmin: values.isSuperAdmin || false,
                department: values.department, eventId: values.eventId,
                lastUpdated: new Date(),
            });
            if (values.role !== editingUser.role) {
                await api.post("/api/users/set-claims", { uid: editingUser.uid, role: values.role });
            }
            message.success("User updated");
            setEditModalVisible(false);
            setEditingUser(null);
            editForm.resetFields();
            fetchUsers();
        } catch (err) {
            message.error("Failed to update user");
        }
    };

    // ── Password ───────────────────────────────────────────────────────────────
    const handleChangePassword = async (values) => {
        if (!passwordUser) return;
        try {
            await api.post("/api/users/update-password", { uid: passwordUser.uid, newPassword: values.newPassword });
            message.success("Password changed!");
            setPasswordModalVisible(false);
            passwordForm.resetFields();
            setPasswordUser(null);
        } catch (err) {
            message.error(err.response?.data?.error || "Failed to change password");
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (user) => {
        try {
            await api.delete("/api/users/delete", { data: { uid: user.uid } });
            await deleteDoc(doc(db, "users", user.id));
            message.success("User deleted");
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.error || "Failed to delete user");
        }
    };

    // ── Toggle Disabled ────────────────────────────────────────────────────────
    const handleToggleDisabled = async (user) => {
        const next = !user.disabled;
        try {
            await api.post("/api/users/toggle-status", { uid: user.uid, disabled: next });
            await updateDoc(doc(db, "users", user.id), {
                disabled: next, status: next ? "disabled" : "active", lastUpdated: new Date(),
            });
            message.success(`User ${next ? "disabled" : "enabled"}`);
            fetchUsers();
        } catch (err) {
            message.error("Failed to update status");
        }
    };

    // ── Permissions ────────────────────────────────────────────────────────────
    const openPermDrawer = (user) => {
        setPermUser(user);
        setPermData(user.permissions || DEFAULT_PERMISSIONS());
        setPermDrawerVisible(true);
    };

    const savePermissions = async () => {
        if (!permUser) return;
        setPermSaving(true);
        try {
            await updateDoc(doc(db, "users", permUser.id), {
                permissions: permData, lastUpdated: new Date(),
            });
            message.success("Permissions saved!");
            setPermDrawerVisible(false);
            fetchUsers();
        } catch (err) {
            message.error("Failed to save permissions");
        } finally {
            setPermSaving(false);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const ROLE_CONFIG = {
        superadmin: { color: "#ef4444", label: "Super Admin", icon: <CrownOutlined /> },
        admin: { color: "#f59e0b", label: "Admin", icon: <SafetyCertificateOutlined /> },
        moderator: { color: "#3b82f6", label: "Moderator", icon: <SafetyOutlined /> },
        viewer: { color: "#22c55e", label: "Viewer", icon: <EyeOutlined /> },
        user: { color: "#6b7280", label: "User", icon: <UserOutlined /> },
    };

    const permSummary = (user) => {
        if (!user.permissions) return 0;
        let count = 0;
        SCREENS.forEach(s => {
            ACTIONS.forEach(a => { if (user.permissions[s.key]?.[a.key]) count++; });
        });
        BUTTON_PERMISSIONS.forEach(b => { if (user.permissions[b.key]) count++; });
        return count;
    };

    const totalPermissions = SCREENS.length * ACTIONS.length + BUTTON_PERMISSIONS.length;

    // ── Columns ────────────────────────────────────────────────────────────────
    const columns = [
        {
            title: "User",
            key: "user",
            width: 260,
            render: (_, r) => {
                const rc = ROLE_CONFIG[r.role] || ROLE_CONFIG.user;
                return (
                    <Space>
                        <div style={{ position: "relative" }}>
                            <Avatar
                                src={r.photoURL}
                                icon={<UserOutlined />}
                                size={42}
                                style={{
                                    background: `linear-gradient(135deg, ${rc.color}20, ${rc.color}10)`,
                                    border: `2px solid ${rc.color}30`,
                                    color: rc.color,
                                    fontWeight: 700,
                                    fontSize: 16,
                                }}
                            >
                                {!r.photoURL && r.displayName?.[0]?.toUpperCase()}
                            </Avatar>
                            <div style={{
                                position: "absolute", bottom: -2, right: -2,
                                width: 12, height: 12, borderRadius: "50%",
                                background: r.disabled ? "#ef4444" : "#22c55e",
                                border: "2px solid #ffffff",
                            }} />
                        </div>
                        <Space direction="vertical" size={1}>
                            <Text strong style={{ color: "#1f2937", fontSize: 13.5 }}>{r.displayName}</Text>
                            <Text style={{ color: "#6b7280", fontSize: 11 }}>{r.email}</Text>
                        </Space>
                    </Space>
                );
            },
        },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            width: 160,
            render: (role, r) => {
                const rc = ROLE_CONFIG[role] || ROLE_CONFIG.user;
                return (
                    <Space direction="vertical" size={4}>
                        <div style={styles.roleTag(rc.color)}>
                            <Space size={4}>{rc.icon} {rc.label.toUpperCase()}</Space>
                        </div>
                        {r.isSuperAdmin && (
                            <div style={styles.roleTag("#f59e0b")}>
                                <Space size={4}><CrownOutlined /> SUPER ADMIN</Space>
                            </div>
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Status",
            key: "status",
            width: 110,
            render: (_, r) => (
                <div>
                    <Badge
                        status={r.disabled ? "error" : r.status === "active" ? "success" : "warning"}
                        text={
                            <span style={{ color: r.disabled ? "#ef4444" : r.status === "active" ? "#22c55e" : "#f59e0b", fontSize: 12, fontWeight: 600 }}>
                                {r.disabled ? "Disabled" : r.status === "active" ? "Active" : "Inactive"}
                            </span>
                        }
                    />
                </div>
            ),
        },
        {
            title: "Department",
            dataIndex: "department",
            key: "department",
            width: 120,
            render: (d) => d ? <Tag style={{ borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", fontSize: 11 }}>{d}</Tag> : <Text style={{ color: "#9ca3af" }}>—</Text>,
        },
        {
            title: "Permissions",
            key: "permissions",
            width: 150,
            render: (_, r) => {
                const count = permSummary(r);
                const pct = Math.round((count / totalPermissions) * 100);
                return (
                    <div style={{ cursor: "pointer" }} onClick={() => openPermDrawer(r)}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ color: "#6b7280", fontSize: 11 }}>{count}/{totalPermissions}</Text>
                            <Text style={{ color: "#3b82f6", fontSize: 11 }}>{pct}%</Text>
                        </div>
                        <Progress
                            percent={pct}
                            showInfo={false}
                            size={["100%", 4]}
                            strokeColor={{ from: "#3b82f6", to: "#8b5cf6" }}
                            trailColor="#e5e7eb"
                        />
                    </div>
                );
            },
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 100,
            render: (d) => <Text style={{ color: "#6b7280", fontSize: 12 }}>{d?.toLocaleDateString?.() || "N/A"}</Text>,
        },
        {
            title: "Actions",
            key: "actions",
            width: 200,
            render: (_, r) => (
                <Space size={2}>
                    <Tooltip title="Edit User">
                        <Button type="text" size="small" icon={<EditOutlined />}
                            style={{ color: "#3b82f6" }} onClick={() => handleEdit(r)} />
                    </Tooltip>
                    <Tooltip title="Set Permissions">
                        <Button type="text" size="small" icon={<SafetyOutlined />}
                            style={{ color: "#8b5cf6" }} onClick={() => openPermDrawer(r)} />
                    </Tooltip>
                    <Tooltip title="Change Password">
                        <Button type="text" size="small" icon={<KeyOutlined />}
                            style={{ color: "#f59e0b" }} onClick={() => { setPasswordUser(r); setPasswordModalVisible(true); }} />
                    </Tooltip>
                    <Tooltip title={r.disabled ? "Enable" : "Disable"}>
                        <Switch checked={!r.disabled} onChange={() => handleToggleDisabled(r)}
                            size="small" />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete User?"
                            description={`Delete ${r.displayName}? This cannot be undone.`}
                            onConfirm={() => handleDelete(r)}
                            okText="Delete" cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = {
        total: users.length,
        active: users.filter(u => !u.disabled && u.status === "active").length,
        disabled: users.filter(u => u.disabled).length,
        admins: users.filter(u => u.role === "admin" || u.isSuperAdmin).length,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={styles.page}>

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{ ...styles.headerCard, padding: "24px 28px" }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg,#3b82f6,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(59,130,246,0.2)" }}>
                                <TeamOutlined style={{ fontSize: 22, color: "#fff" }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937", letterSpacing: -0.5 }}>User Management</div>
                                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Manage users, roles, permissions & account settings</div>
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}
                                style={styles.ghostBtn}>Refresh</Button>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => setCreateModalVisible(true)}
                                style={styles.primaryBtn}>Create User</Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* ── Stats ──────────────────────────────────────────────────────── */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                {[
                    { label: "Total Users", value: stats.total, icon: <UserOutlined />, color: "#3b82f6", bg: "#eff6ff" },
                    { label: "Active", value: stats.active, icon: <CheckCircleOutlined />, color: "#22c55e", bg: "#f0fdf4" },
                    { label: "Disabled", value: stats.disabled, icon: <CloseCircleOutlined />, color: "#ef4444", bg: "#fef2f2" },
                    { label: "Admins", value: stats.admins, icon: <CrownOutlined />, color: "#f59e0b", bg: "#fffbeb" },
                ].map((s, i) => (
                    <Col span={6} key={i}>
                        <div style={{ ...styles.statCard, padding: "20px 22px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                                    <div style={{ fontSize: 34, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                </div>
                                <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                            <div style={{ marginTop: 12, height: 3, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${stats.total ? (s.value / stats.total) * 100 : 0}%`, background: s.color, borderRadius: 2, transition: "width 0.5s" }} />
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>

            {/* ── Table ──────────────────────────────────────────────────────── */}
            <div style={styles.tableCard}>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showTotal: (t) => <span style={{ color: "#6b7280" }}>Total {t} users</span>,
                        showSizeChanger: true,
                        showQuickJumper: true,
                    }}
                    scroll={{ x: 1100 }}
                />
            </div>

            {/* ── Permissions Drawer ──────────────────────────────────────────── */}
            <Drawer
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f3e8ff", border: "1px solid #d8b4fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <SafetyOutlined style={{ color: "#8b5cf6", fontSize: 17 }} />
                        </div>
                        <div>
                            <div style={{ color: "#1f2937", fontWeight: 700, fontSize: 15 }}>Permissions</div>
                            <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 400 }}>{permUser?.displayName}</div>
                        </div>
                    </div>
                }
                placement="right"
                width={620}
                open={permDrawerVisible}
                onClose={() => setPermDrawerVisible(false)}
                styles={{
                    body: { background: "#ffffff", padding: 24 },
                    header: { background: "#ffffff", borderBottom: "1px solid #e2e8f0" },
                    footer: { background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "16px 24px" },
                }}
                footer={
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <Text style={{ color: "#6b7280", fontSize: 12 }}>
                                {permSummary(permUser || {})} / {totalPermissions} permissions granted
                            </Text>
                        </div>
                        <Space>
                            <Button onClick={() => setPermDrawerVisible(false)} style={{ borderRadius: 9 }}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                loading={permSaving}
                                onClick={savePermissions}
                                icon={<SafetyCertificateOutlined />}
                                style={{ borderRadius: 9, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", border: "none" }}
                            >
                                Save Permissions
                            </Button>
                        </Space>
                    </div>
                }
            >
                {permUser && (
                    <div>
                        {/* User info banner */}
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar size={38} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#3b82f6", fontWeight: 700 }}>
                                {permUser.displayName?.[0]?.toUpperCase()}
                            </Avatar>
                            <div>
                                <div style={{ color: "#1f2937", fontWeight: 600, fontSize: 14 }}>{permUser.displayName}</div>
                                <div style={{ color: "#6b7280", fontSize: 12 }}>{permUser.email} · {permUser.role}</div>
                            </div>
                        </div>
                        <PermissionMatrix
                            permissions={permData}
                            onChange={setPermData}
                        />
                    </div>
                )}
            </Drawer>

            {/* ── Create User Modal ───────────────────────────────────────────── */}
            <Modal
                title={<Space><UserAddOutlined style={{ color: "#3b82f6" }} /><span style={{ color: "#1f2937" }}>Create New User</span></Space>}
                open={createModalVisible}
                onCancel={() => { setCreateModalVisible(false); createForm.resetFields(); }}
                footer={null}
                width={600}
                styles={{ content: { background: "#ffffff", borderRadius: 16 }, header: { background: "#ffffff", borderBottom: "1px solid #e2e8f0" } }}
            >
                <Tabs activeKey={activeTab} onChange={setActiveTab}
                    items={[
                        {
                            key: "1", label: "User Details",
                            children: (
                                <Form form={createForm} layout="vertical" onFinish={handleCreateUser} initialValues={{ role: "viewer" }}>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="displayName" label={<span style={{ color: "#374151" }}>Display Name</span>} rules={[{ required: true }]}>
                                                <Input prefix={<UserOutlined style={{ color: "#9ca3af" }} />} placeholder="Full name" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="email" label={<span style={{ color: "#374151" }}>Email</span>} rules={[{ required: true }, { type: "email" }]}>
                                                <Input prefix={<MailOutlined style={{ color: "#9ca3af" }} />} placeholder="user@example.com" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="password" label={<span style={{ color: "#374151" }}>Password</span>} rules={[{ required: true }, { min: 6 }]}>
                                        <Input.Password prefix={<LockOutlined style={{ color: "#9ca3af" }} />} placeholder="Min 6 characters" />
                                    </Form.Item>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="role" label={<span style={{ color: "#374151" }}>Role</span>} rules={[{ required: true }]}>
                                                <Select placeholder="Select role">
                                                    <Option value="superadmin">Super Admin</Option>
                                                    <Option value="admin">Admin</Option>
                                                    <Option value="moderator">Moderator</Option>
                                                    <Option value="viewer">Viewer</Option>
                                                    <Option value="user">User</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="department" label={<span style={{ color: "#374151" }}>Department</span>}>
                                                <Input placeholder="IT, HR, Marketing…" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="eventId" label={<span style={{ color: "#374151" }}>Event ID</span>}>
                                        <Input placeholder="Optional event assignment" />
                                    </Form.Item>
                                    <Alert message="User will receive a verification email." type="info" showIcon style={{ borderRadius: 9, marginBottom: 16 }} />
                                    <div style={{ textAlign: "right" }}>
                                        <Space>
                                            <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
                                            <Button type="primary" htmlType="submit" style={styles.primaryBtn}>Create User</Button>
                                        </Space>
                                    </div>
                                </Form>
                            ),
                        },
                    ]}
                />
            </Modal>

            {/* ── Edit Modal ──────────────────────────────────────────────────── */}
            <Modal
                title={<Space><EditOutlined style={{ color: "#3b82f6" }} /><span style={{ color: "#1f2937" }}>Edit User</span></Space>}
                open={editModalVisible}
                onCancel={() => { setEditModalVisible(false); setEditingUser(null); editForm.resetFields(); }}
                footer={null}
                width={600}
                styles={{ content: { background: "#ffffff", borderRadius: 16 }, header: { background: "#ffffff", borderBottom: "1px solid #e2e8f0" } }}
            >
                <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="displayName" label={<span style={{ color: "#374151" }}>Display Name</span>} rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined style={{ color: "#9ca3af" }} />} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label={<span style={{ color: "#374151" }}>Email</span>}>
                                <Input prefix={<MailOutlined style={{ color: "#9ca3af" }} />} disabled />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="role" label={<span style={{ color: "#374151" }}>Role</span>} rules={[{ required: true }]}>
                                <Select>
                                    <Option value="superadmin">Super Admin</Option>
                                    <Option value="admin">Admin</Option>
                                    <Option value="moderator">Moderator</Option>
                                    <Option value="viewer">Viewer</Option>
                                    <Option value="user">User</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label={<span style={{ color: "#374151" }}>Status</span>} rules={[{ required: true }]}>
                                <Select>
                                    <Option value="active">Active</Option>
                                    <Option value="inactive">Inactive</Option>
                                    <Option value="suspended">Suspended</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="department" label={<span style={{ color: "#374151" }}>Department</span>}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="eventId" label={<span style={{ color: "#374151" }}>Event ID</span>}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="isSuperAdmin" label={<span style={{ color: "#374151" }}>Super Admin</span>} valuePropName="checked">
                        <Switch checkedChildren="Yes" unCheckedChildren="No" />
                    </Form.Item>
                    <div style={{ textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => setEditModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" style={styles.primaryBtn}>Update User</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* ── Change Password Modal ───────────────────────────────────────── */}
            <Modal
                title={<Space><KeyOutlined style={{ color: "#f59e0b" }} /><span style={{ color: "#1f2937" }}>Change Password</span></Space>}
                open={passwordModalVisible}
                onCancel={() => { setPasswordModalVisible(false); setPasswordUser(null); passwordForm.resetFields(); }}
                footer={null}
                width={440}
                styles={{ content: { background: "#ffffff", borderRadius: 16 }, header: { background: "#ffffff", borderBottom: "1px solid #e2e8f0" } }}
            >
                <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                    <Alert
                        message={`Changing password for: ${passwordUser?.displayName}`}
                        description={passwordUser?.email}
                        type="warning" showIcon
                        style={{ borderRadius: 9, marginBottom: 16 }}
                    />
                    <Form.Item name="newPassword" label={<span style={{ color: "#374151" }}>New Password</span>} rules={[{ required: true }, { min: 6 }]}>
                        <Input.Password prefix={<LockOutlined style={{ color: "#9ca3af" }} />} placeholder="Min 6 characters" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label={<span style={{ color: "#374151" }}>Confirm Password</span>}
                        dependencies={["newPassword"]}
                        rules={[{ required: true }, ({ getFieldValue }) => ({
                            validator(_, v) {
                                if (!v || getFieldValue("newPassword") === v) return Promise.resolve();
                                return Promise.reject("Passwords do not match");
                            },
                        })]}>
                        <Input.Password prefix={<LockOutlined style={{ color: "#9ca3af" }} />} placeholder="Confirm password" />
                    </Form.Item>
                    <div style={{ textAlign: "right" }}>
                        <Space>
                            <Button onClick={() => setPasswordModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit"
                                style={{ ...styles.primaryBtn, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                                Change Password
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagementPage;