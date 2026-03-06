import {
    LayoutDashboard,
    GraduationCap,
    BookOpen,
    Users,
    Settings,
    HeartHandshake,
    Activity,
} from 'lucide-react';

export type MenuItem = {
    title: string;
    path?: string;
    icon?: any;
    submenu?: MenuItem[];
};

export const menuConfig: Record<string, MenuItem[]> = {
    AWARDEE: [
        { title: 'Dashboard Utama', path: '/dashboard/awardee', icon: LayoutDashboard },
        {
            title: 'Capaian Pendidikan',
            icon: GraduationCap,
            submenu: [
                { title: 'Pembinaan S/H Skills', path: '/dashboard/awardee/pendidikan/pembinaan' },
                { title: 'Perkuliahan', path: '/dashboard/awardee/pendidikan/perkuliahan' },
                { title: 'Riwayat Prestasi', path: '/dashboard/awardee/pendidikan/prestasi' },
                { title: 'Riwayat Organisasi', path: '/dashboard/awardee/pendidikan/organisasi' },
                { title: 'Riwayat Workshop / Seminar', path: '/dashboard/awardee/pendidikan/workshop' },
            ],
        },
        {
            title: 'Riwayat Ibadah',
            icon: BookOpen,
            submenu: [
                { title: 'Laporan Ibadah Harian', path: '/dashboard/awardee/ibadah/harian' },
                { title: 'Laporan Hafalan', path: '/dashboard/awardee/ibadah/hafalan' },
            ],
        },
        {
            title: 'Pemberdayaan',
            icon: HeartHandshake,
            submenu: [
                { title: 'Kunjungan Program', path: '/dashboard/awardee/pemberdayaan/kunjungan' },
                { title: 'Portfolio Social Project', path: '/dashboard/awardee/pemberdayaan/portfolio' },
                { title: 'Narasumber Pemberdayaan', path: '/dashboard/awardee/pemberdayaan/narasumber' },
            ],
        },
        { title: 'Profile & Pengaturan', path: '/dashboard/profile', icon: Settings },
    ],
    FASILITATOR: [
        { title: 'Dashboard Utama', path: '/dashboard/fasilitator', icon: LayoutDashboard },
        {
            title: 'Monitoring Pendidikan',
            icon: Activity,
            submenu: [
                {
                    title: 'BRIGHT Scholarship',
                    submenu: [
                        { title: 'Buat Pengumuman', path: '/dashboard/fasilitator/pengumuman' },
                        { title: 'Buat Jadwal Pembinaan', path: '/dashboard/fasilitator/pembinaan' },
                        { title: 'Buat Pesan Khusus', path: '/dashboard/fasilitator/pesan' },
                    ]
                },
            ],
        },
        {
            title: 'Monitoring Ibadah',
            icon: BookOpen,
            submenu: [
                { title: 'BRIGHT Scholarship', path: '/dashboard/fasilitator/ibadah/bright' },
            ],
        },
        { title: 'Profile & Pengaturan', path: '/dashboard/profile', icon: Settings },
    ],
    ADMIN: [
        { title: 'Dashboard Utama', path: '/dashboard/admin', icon: LayoutDashboard },
        {
            title: 'Pengguna',
            icon: Users,
            submenu: [
                { title: 'Fasilitator', path: '/dashboard/admin/pengguna/fasilitator' },
                { title: 'Awardee', path: '/dashboard/admin/pengguna/awardee' },
            ],
        },
        { title: 'Profile & Pengaturan', path: '/dashboard/profile', icon: Settings },
    ],
};
