import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import type React from 'react';

const C = colors.light;
const MISSING_KEY_GOOGLE_FORM_URL = '';
const CURRENT_USER = 'Amit Patel';

type Tab = 'home' | 'scanner' | 'keys' | 'notifications' | 'profile';
type ViewName =
  | 'tab'
  | 'key-detail'
  | 'send-employee'
  | 'pending'
  | 'outcome'
  | 'scan-transfer'
  | 'incoming-detail'
  | 'history'
  | 'bulk-select'
  | 'bulk-recipient'
  | 'bulk-summary'
  | 'job-open'
  | 'job-close'
  | 'missing'
  | 'report';
type OutcomeType = 'complete' | 'rejected' | 'expired' | 'cancelled' | 'opened' | 'delivered';
type TransferPurpose = 'Recovery' | 'Repair' | 'Parking';

const transferPurposes: { value: TransferPurpose; icon: React.ComponentProps<typeof Feather>['name']; description: string }[] = [
  { value: 'Recovery', icon: 'refresh-cw', description: 'Recover or relocate the vehicle' },
  { value: 'Repair', icon: 'tool', description: 'Move into a repair workflow' },
  { value: 'Parking', icon: 'map-pin', description: 'Move for parking or staging' },
];

type KeyRecord = {
  id: string;
  vehicle: string;
  keyId: string;
  department: string;
  custodian: string;
  received: string;
  jobCard: 'Open' | 'Closed';
  vehicleStatus: 'Inside Garage' | 'Outside Garage';
  transferStatus: 'Assigned' | 'Transfer pending' | 'Missing';
  history: HistoryEvent[];
};

type HistoryEvent = {
  title: string;
  detail: string;
  time: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'gray';
};

type Employee = {
  name: string;
  department: string;
  role: string;
  keys: number;
  initials: string;
};

type Transfer = {
  id: string;
  keyIds: string[];
  recipient: Employee;
  vehicle: string;
  sender: string;
  senderDepartment: string;
  purpose: TransferPurpose;
  startedAt: string;
  remaining: number;
  kind: 'single' | 'bulk';
  status: 'pending' | 'complete' | 'rejected' | 'expired' | 'cancelled';
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  tone: 'blue' | 'green' | 'amber' | 'red';
  incoming?: boolean;
};

const employees: Employee[] = [
  { name: 'Rahul Sharma', department: 'Service', role: 'Senior Mechanic', keys: 4, initials: 'RS' },
  { name: 'Priya Nair', department: 'Service Advisor', role: 'Advisor', keys: 1, initials: 'PN' },
  { name: 'Rohan Mehta', department: 'Body Shop', role: 'Technician', keys: 3, initials: 'RM' },
  { name: 'Sneha Shah', department: 'Operations', role: 'Supervisor', keys: 6, initials: 'SS' },
];

const initialKeys: KeyRecord[] = [
  {
    id: 'key-01',
    vehicle: 'MH 01 AB 1234',
    keyId: 'KEY-0248',
    department: 'Mechanical',
    custodian: CURRENT_USER,
    received: 'Today, 09:42',
    jobCard: 'Open',
    vehicleStatus: 'Inside Garage',
    transferStatus: 'Assigned',
    history: [
      { title: 'Job card opened', detail: 'Opened by Amit Patel', time: 'Today, 10:16', tone: 'blue' },
      { title: 'Key received', detail: 'Transferred from Rahul Sharma', time: 'Today, 09:42', tone: 'green' },
      { title: 'Vehicle checked in', detail: 'Mechanical bay 03', time: 'Today, 09:30', tone: 'gray' },
    ],
  },
  {
    id: 'key-02',
    vehicle: 'MH 04 EF 9012',
    keyId: 'KEY-0193',
    department: 'Electrical',
    custodian: CURRENT_USER,
    received: 'Yesterday, 16:08',
    jobCard: 'Closed',
    vehicleStatus: 'Outside Garage',
    transferStatus: 'Assigned',
    history: [
      { title: 'Key received', detail: 'Transferred from Priya Nair', time: 'Yesterday, 16:08', tone: 'green' },
      { title: 'Job card closed', detail: 'Vehicle delivered', time: 'Yesterday, 15:52', tone: 'gray' },
    ],
  },
  {
    id: 'key-03',
    vehicle: 'MH 02 CD 5678',
    keyId: 'KEY-0319',
    department: 'Mechanical',
    custodian: 'Rahul Sharma',
    received: 'Today, 08:18',
    jobCard: 'Open',
    vehicleStatus: 'Inside Garage',
    transferStatus: 'Assigned',
    history: [
      { title: 'Transfer initiated', detail: 'Rahul Sharma sent key to Amit Patel', time: 'Today, 11:18', tone: 'amber' },
      { title: 'Job card opened', detail: 'Opened by Rahul Sharma', time: 'Today, 08:42', tone: 'blue' },
    ],
  },
  {
    id: 'key-04',
    vehicle: 'MH 43 GH 3456',
    keyId: 'KEY-0441',
    department: 'Body Shop',
    custodian: 'Rohan Mehta',
    received: 'Today, 07:56',
    jobCard: 'Closed',
    vehicleStatus: 'Outside Garage',
    transferStatus: 'Missing',
    history: [
      { title: 'Missing key reported', detail: 'Reported by Rohan Mehta', time: 'Today, 10:03', tone: 'red' },
      { title: 'Key received', detail: 'Assigned to Body Shop', time: 'Today, 07:56', tone: 'green' },
    ],
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'n-incoming',
    title: 'Incoming Key Transfer',
    body: 'Rahul Sharma wants to transfer MH 02 CD 5678 to you · Repair',
    time: 'Just now',
    unread: true,
    tone: 'amber',
    incoming: true,
  },
  {
    id: 'n-report',
    title: 'Missing Keys Report',
    body: '12 missing keys · Estimated cost ₹24,000',
    time: 'Yesterday',
    unread: true,
    tone: 'red',
  },
  {
    id: 'n-accepted',
    title: 'Transfer Accepted',
    body: 'Priya Nair accepted your transfer for MH 04 EF 9012.',
    time: 'Monday',
    unread: false,
    tone: 'green',
  },
];

function nowLabel() {
  return 'Today, 11:32';
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function toneColor(tone: 'blue' | 'green' | 'amber' | 'red' | 'gray') {
  return {
    blue: C.primary,
    green: C.success,
    amber: C.warning,
    red: C.destructive,
    gray: C.mutedForeground,
  }[tone];
}

function Icon({
  name,
  size = 20,
  color = C.foreground,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
}

function Pill({
  label,
  tone = 'blue',
  dot = false,
}: {
  label: string;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  dot?: boolean;
}) {
  const color = toneColor(tone);
  return (
    <View style={[styles.pill, { backgroundColor: `${color}16` }]}>
      {dot ? <View style={[styles.pillDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled = false,
  variant = 'primary',
  testID,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  testID?: string;
}) {
  const backgroundColor =
    variant === 'primary'
      ? C.primary
      : variant === 'danger'
        ? `${C.destructive}13`
        : variant === 'secondary'
          ? C.secondary
          : 'transparent';
  const labelColor =
    variant === 'primary' ? C.primaryForeground : variant === 'danger' ? C.destructive : variant === 'ghost' ? C.primary : C.secondaryForeground;
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (!disabled) {
          Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
        variant === 'ghost' && styles.ghostButton,
        variant === 'danger' && styles.dangerButton,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={labelColor} /> : null}
      <Text style={[styles.primaryButtonText, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={10}>
            <Icon name="arrow-left" size={21} color={C.foreground} />
          </Pressable>
        ) : (
          <View style={styles.brandMark}>
            <Icon name="key" size={17} color={C.primaryForeground} />
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

function SectionLabel({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {action}
    </View>
  );
}

function StatCard({ icon, value, label, accent, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; value: string; label: string; accent: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.statCard, { opacity: pressed ? 0.86 : 1 }]}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}14` }]}>
        <Icon name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function KeyCard({ item, onPress, onTransfer, onHistory }: { item: KeyRecord; onPress: () => void; onTransfer: () => void; onHistory: () => void }) {
  return (
    <View style={styles.keyCard}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.keyCardMain, { opacity: pressed ? 0.78 : 1 }]}>
        <View style={styles.vehicleGlyph}>
          <Icon name="truck" size={20} color={C.primary} />
        </View>
        <View style={styles.keyCardCopy}>
          <View style={styles.vehicleLine}>
            <Text style={styles.vehicleNumber}>{item.vehicle}</Text>
            {item.transferStatus === 'Transfer pending' ? <Pill label="Pending" tone="amber" dot /> : null}
            {item.transferStatus === 'Missing' ? <Pill label="Missing" tone="red" dot /> : null}
          </View>
          <Text style={styles.keyMeta}>{item.department} · {item.keyId}</Text>
          <View style={styles.keyStatusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: item.jobCard === 'Open' ? C.primary : C.mutedForeground }]} />
              <Text style={styles.statusText}>Job card {item.jobCard}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: item.vehicleStatus === 'Inside Garage' ? C.success : C.mutedForeground }]} />
              <Text style={styles.statusText}>{item.vehicleStatus}</Text>
            </View>
          </View>
        </View>
        <Icon name="chevron-right" size={18} color={C.mutedForeground} />
      </Pressable>
      <View style={styles.keyCardFooter}>
        <Text style={styles.receivedText}>Received {item.received}</Text>
        <View style={styles.cardActions}>
          <Pressable onPress={onHistory} style={styles.smallAction}>
            <Icon name="clock" size={14} color={C.primary} />
            <Text style={styles.smallActionText}>History</Text>
          </Pressable>
          <Pressable onPress={onTransfer} style={styles.smallAction}>
            <Icon name="send" size={14} color={C.primary} />
            <Text style={styles.smallActionText}>Transfer</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Icon name={icon} size={24} color={C.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export default function App() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [view, setView] = useState<ViewName>('tab');
  const [keys, setKeys] = useState<KeyRecord[]>(initialKeys);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<TransferPurpose | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [activeTransfer, setActiveTransfer] = useState<Transfer | null>(null);
  const [outcome, setOutcome] = useState<OutcomeType>('complete');
  const [incomingTransfer, setIncomingTransfer] = useState<Transfer | null>(null);
  const [replacementCost, setReplacementCost] = useState('2000');
  const [hydrated, setHydrated] = useState(false);

  const myKeys = useMemo(() => keys.filter((item) => item.custodian === CURRENT_USER && item.transferStatus !== 'Missing'), [keys]);
  const visibleKeys = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return myKeys;
    return keys.filter((item) => `${item.vehicle} ${item.keyId}`.toLowerCase().includes(query));
  }, [keys, myKeys, search]);
  const selectedKey = selectedKeyId ? keys.find((item) => item.id === selectedKeyId) ?? null : null;
  const unreadCount = notifications.filter((item) => item.unread).length;
  const incomingNotification = notifications.find((item) => item.incoming);

  useEffect(() => {
    AsyncStorage.multiGet(['fleet-keys', 'fleet-notifications']).then((entries) => {
      const storedKeys = entries[0][1];
      const storedNotifications = entries[1][1];
      if (storedKeys) setKeys(JSON.parse(storedKeys) as KeyRecord[]);
      if (storedNotifications) setNotifications(JSON.parse(storedNotifications) as NotificationItem[]);
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.multiSet([
      ['fleet-keys', JSON.stringify(keys)],
      ['fleet-notifications', JSON.stringify(notifications)],
    ]).catch(() => undefined);
  }, [hydrated, keys, notifications]);

  useEffect(() => {
    if (view !== 'pending' || !activeTransfer || activeTransfer.status !== 'pending') return;
    if (activeTransfer.remaining <= 0) {
      setActiveTransfer({ ...activeTransfer, status: 'expired' });
      setOutcome('expired');
      setView('outcome');
      return;
    }
    const timer = setTimeout(() => setActiveTransfer((current) => current ? { ...current, remaining: current.remaining - 1 } : current), 1000);
    return () => clearTimeout(timer);
  }, [view, activeTransfer]);

  const goTab = (tab: Tab) => {
    setActiveTab(tab);
    setView('tab');
    setSelectedKeyId(null);
    setSearch('');
  };

  const openKey = (keyId: string) => {
    setSelectedKeyId(keyId);
    setView('key-detail');
  };

  const openSenderFlow = (keyId: string) => {
    const item = keys.find((key) => key.id === keyId);
    if (!item) return;
    if (item.custodian !== CURRENT_USER) {
      Alert.alert('Unauthorized Action', 'Only the current custodian may perform this action.');
      return;
    }
    if (item.transferStatus === 'Transfer pending') {
      Alert.alert('Transfer Already In Progress', 'This key already has an active transfer.');
      return;
    }
    setSelectedKeyId(keyId);
    setSelectedEmployee(null);
    setSelectedPurpose(null);
    setView('send-employee');
  };

  const startTransfer = () => {
    if (!selectedKey || !selectedEmployee || !selectedPurpose) return;
    const transfer: Transfer = {
      id: `transfer-${Date.now()}`,
      keyIds: [selectedKey.id],
      recipient: selectedEmployee,
      vehicle: selectedKey.vehicle,
      sender: CURRENT_USER,
      senderDepartment: 'Mechanical',
      purpose: selectedPurpose,
      startedAt: nowLabel(),
      remaining: 120,
      kind: 'single',
      status: 'pending',
    };
    setKeys((current) => current.map((item) => item.id === selectedKey.id ? { ...item, transferStatus: 'Transfer pending' } : item));
    setNotifications((current) => [
      { id: `n-${Date.now()}`, title: 'Transfer Initiated', body: `Waiting for ${selectedEmployee.name} to accept ${selectedKey.vehicle}.`, time: 'Just now', unread: true, tone: 'amber' },
      ...current,
    ]);
    setActiveTransfer(transfer);
    setView('pending');
  };

  const openIncoming = () => {
    const sourceKey = keys.find((item) => item.id === 'key-03');
    const receiver = { name: CURRENT_USER, department: 'Mechanical', role: 'Technician', keys: myKeys.length, initials: 'AP' };
    if (!sourceKey) return;
    setIncomingTransfer({
      id: 'incoming-demo',
      keyIds: [sourceKey.id],
      recipient: receiver,
      vehicle: sourceKey.vehicle,
      sender: sourceKey.custodian,
      senderDepartment: sourceKey.department,
      purpose: 'Repair',
      startedAt: 'Today, 11:18',
      remaining: 106,
      kind: 'single',
      status: 'pending',
    });
    setNotifications((current) => current.map((item) => item.id === 'n-incoming' ? { ...item, unread: false } : item));
    setView('scan-transfer');
  };

  const acceptIncoming = () => {
    if (!incomingTransfer) return;
    setKeys((current) => current.map((item) => item.id === incomingTransfer.keyIds[0] ? {
      ...item,
      custodian: CURRENT_USER,
      received: nowLabel(),
      transferStatus: 'Assigned',
      history: [
        { title: 'Transfer accepted', detail: `Accepted by ${CURRENT_USER}`, time: nowLabel(), tone: 'green' },
        { title: 'Transfer initiated', detail: `${incomingTransfer.sender} sent key to ${CURRENT_USER}`, time: incomingTransfer.startedAt, tone: 'amber' },
        ...item.history,
      ],
    } : item));
    setNotifications((current) => [
      { id: `accepted-${Date.now()}`, title: 'Transfer Accepted', body: `You are now custodian of ${incomingTransfer.vehicle}.`, time: 'Just now', unread: true, tone: 'green' },
      ...current.filter((item) => item.id !== 'n-incoming'),
    ]);
    setOutcome('complete');
    setView('outcome');
  };

  const rejectIncoming = () => {
    if (!incomingTransfer) return;
    setNotifications((current) => [
      { id: `rejected-${Date.now()}`, title: 'Transfer Rejected', body: `You rejected the transfer for ${incomingTransfer.vehicle}.`, time: 'Just now', unread: true, tone: 'red' },
      ...current.filter((item) => item.id !== 'n-incoming'),
    ]);
    setOutcome('rejected');
    setView('outcome');
  };

  const cancelTransfer = () => {
    if (!activeTransfer) return;
    setKeys((current) => current.map((item) => activeTransfer.keyIds.includes(item.id) ? { ...item, transferStatus: 'Assigned' } : item));
    setActiveTransfer({ ...activeTransfer, status: 'cancelled' });
    setOutcome('cancelled');
    setView('outcome');
  };

  const previewReceiver = () => {
    if (!activeTransfer) return;
    setIncomingTransfer({ ...activeTransfer });
    setView('scan-transfer');
  };

  const finishSenderDemo = (type: 'complete' | 'rejected') => {
    if (!activeTransfer) return;
    if (type === 'complete') {
      setKeys((current) => current.filter((item) => !activeTransfer.keyIds.includes(item.id)));
      setOutcome('complete');
    } else {
      setKeys((current) => current.map((item) => activeTransfer.keyIds.includes(item.id) ? { ...item, transferStatus: 'Assigned' } : item));
      setOutcome('rejected');
    }
    setActiveTransfer({ ...activeTransfer, status: type });
    setView('outcome');
  };

  const openJobCard = () => {
    if (!selectedKey) return;
    setView('job-open');
  };

  const confirmOpenJobCard = () => {
    if (!selectedKey) return;
    setKeys((current) => current.map((item) => item.id === selectedKey.id ? {
      ...item,
      jobCard: 'Open',
      vehicleStatus: 'Inside Garage',
      history: [{ title: 'Job card opened', detail: `Opened by ${CURRENT_USER}`, time: nowLabel(), tone: 'blue' }, ...item.history],
    } : item));
    setOutcome('opened');
    setView('outcome');
  };

  const confirmCloseJobCard = () => {
    if (!selectedKey) return;
    setKeys((current) => current.filter((item) => item.id !== selectedKey.id));
    setOutcome('delivered');
    setView('outcome');
  };

  const toggleBulk = (id: string) => {
    setSelectedBulkIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const startBulkFlow = () => {
    setSelectedBulkIds([]);
    setSelectedEmployee(null);
    setSelectedPurpose(null);
    setView('bulk-select');
  };

  const startBulkTransfer = () => {
    if (!selectedEmployee || selectedBulkIds.length === 0 || !selectedPurpose) return;
    const selectedVehicles = keys.filter((item) => selectedBulkIds.includes(item.id)).map((item) => item.vehicle);
    const transfer: Transfer = {
      id: `bulk-${Date.now()}`,
      keyIds: selectedBulkIds,
      recipient: selectedEmployee,
      vehicle: selectedVehicles.join(', '),
      sender: CURRENT_USER,
      senderDepartment: 'Mechanical',
      purpose: selectedPurpose,
      startedAt: nowLabel(),
      remaining: 120,
      kind: 'bulk',
      status: 'pending',
    };
    setKeys((current) => current.map((item) => selectedBulkIds.includes(item.id) ? { ...item, transferStatus: 'Transfer pending' } : item));
    setActiveTransfer(transfer);
    setView('pending');
  };

  const renderHome = () => (
    <>
      <Header title="Good morning, Amit" subtitle="Wednesday, 26 August 2026" right={<Pressable style={styles.headerBell} onPress={() => goTab('notifications')}><Icon name="bell" size={20} color={C.foreground} />{unreadCount > 0 ? <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{unreadCount}</Text></View> : null}</Pressable>} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>KEY CONTROL CENTER</Text>
            <Text style={styles.heroTitle}>Every key has a clear custodian.</Text>
            <Text style={styles.heroBody}>Fast handoffs, verified at the vehicle.</Text>
          </View>
          <View style={styles.heroGraphic}><Icon name="key" size={34} color={C.primaryForeground} /><View style={styles.heroPulse} /></View>
        </View>

        <SectionLabel>Today at a glance</SectionLabel>
        <View style={styles.statsGrid}>
          <StatCard icon="key" value={String(myKeys.length)} label="My keys" accent={C.primary} onPress={() => goTab('keys')} />
          <StatCard icon="inbox" value={incomingNotification && incomingNotification.unread ? '1' : '0'} label="Incoming transfers" accent={C.warning} onPress={() => goTab('notifications')} />
          <StatCard icon="check-circle" value="7" label="Transfers completed" accent={C.success} />
        </View>

        <SectionLabel>Quick actions</SectionLabel>
        <View style={styles.actionGrid}>
          <Pressable style={styles.quickAction} onPress={() => goTab('scanner')}><View style={[styles.quickIcon, { backgroundColor: `${C.primary}16` }]}><Icon name="maximize" size={20} color={C.primary} /></View><Text style={styles.quickTitle}>Scan QR</Text><Text style={styles.quickSubtitle}>Verify a key</Text></Pressable>
          <Pressable style={styles.quickAction} onPress={() => goTab('keys')}><View style={[styles.quickIcon, { backgroundColor: `${C.success}16` }]}><Icon name="key" size={20} color={C.success} /></View><Text style={styles.quickTitle}>My keys</Text><Text style={styles.quickSubtitle}>View assigned</Text></Pressable>
          <Pressable style={styles.quickAction} onPress={() => myKeys[0] ? openSenderFlow(myKeys[0].id) : undefined}><View style={[styles.quickIcon, { backgroundColor: `${C.warning}16` }]}><Icon name="send" size={20} color={C.warning} /></View><Text style={styles.quickTitle}>Send key</Text><Text style={styles.quickSubtitle}>Start a handoff</Text></Pressable>
          <Pressable style={styles.quickAction} onPress={startBulkFlow}><View style={[styles.quickIcon, { backgroundColor: `${C.purple}16` }]}><Icon name="layers" size={20} color={C.purple} /></View><Text style={styles.quickTitle}>Bulk send</Text><Text style={styles.quickSubtitle}>Move multiple</Text></Pressable>
        </View>

        <Pressable style={styles.incomingBanner} onPress={openIncoming}>
          <View style={styles.incomingIcon}><Icon name="arrow-down-left" size={19} color={C.warning} /></View>
          <View style={styles.incomingCopy}><View style={styles.inlineTitle}><Text style={styles.incomingTitle}>Incoming key transfer</Text><Pill label="Action required" tone="amber" /></View><Text style={styles.incomingBody}>Rahul Sharma · MH 02 CD 5678</Text></View>
          <Icon name="chevron-right" size={19} color={C.warning} />
        </Pressable>

        <SectionLabel action={<Pressable onPress={() => goTab('keys')}><Text style={styles.sectionAction}>View all</Text></Pressable>}>Recent keys</SectionLabel>
        {myKeys.slice(0, 2).map((item) => <KeyCard key={item.id} item={item} onPress={() => openKey(item.id)} onTransfer={() => openSenderFlow(item.id)} onHistory={() => { setSelectedKeyId(item.id); setView('history'); }} />)}
      </ScrollView>
    </>
  );

  const renderScanner = () => (
    <>
      <Header title="Scanner" subtitle="Verify a vehicle key" right={<View style={styles.demoPill}><View style={styles.liveDot} /><Text style={styles.demoPillText}>Ready</Text></View>} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.scannerCard}>
          <View style={styles.scannerTop}><Text style={styles.scannerKicker}>VEHICLE VERIFICATION</Text><Icon name="more-horizontal" size={21} color={C.mutedForeground} /></View>
          <Text style={styles.scannerTitle}>{incomingTransfer ? 'Scan the key to continue' : 'Scan Vehicle QR Code'}</Text>
          <Text style={styles.scannerBody}>{incomingTransfer ? 'Match this physical key to the pending transfer.' : 'Point your camera at the QR code attached to the vehicle key.'}</Text>
          <View style={styles.qrFrame}><View style={[styles.corner, styles.cornerTL]} /><View style={[styles.corner, styles.cornerTR]} /><View style={[styles.corner, styles.cornerBL]} /><View style={[styles.corner, styles.cornerBR]} /><View style={styles.fakeQr}><View style={styles.qrBlock} /><View style={[styles.qrBlock, styles.qrBlockSmall]} /><View style={[styles.qrBlock, styles.qrBlockWide]} /><View style={[styles.qrBlock, styles.qrBlockTiny]} /></View><View style={styles.scanLine} /></View>
          <PrimaryButton label={incomingTransfer ? 'Simulate key scan' : 'Scan QR code'} icon="maximize" onPress={() => incomingTransfer ? setView('incoming-detail') : Alert.alert('Scanner Ready', 'Point the camera at a vehicle key QR code. Use Search Key if the code cannot be read.')} testID="scan-qr-button" />
        </View>
        <View style={styles.scannerNote}><Icon name="shield" size={17} color={C.primary} /><Text style={styles.scannerNoteText}>QR verification prevents a transfer from being accepted against the wrong vehicle.</Text></View>
        <SectionLabel>Can’t scan?</SectionLabel>
        <View style={styles.searchCard}>
          <View style={styles.inputWrap}><Icon name="search" size={18} color={C.mutedForeground} /><TextInput value={search} onChangeText={setSearch} placeholder="Search vehicle or key ID" placeholderTextColor={C.mutedForeground} style={styles.input} /></View>
          {search.trim() ? visibleKeys.map((item) => <Pressable key={item.id} style={styles.searchResult} onPress={() => openKey(item.id)}><View style={styles.resultIcon}><Icon name="truck" size={17} color={C.primary} /></View><View><Text style={styles.resultVehicle}>{item.vehicle}</Text><Text style={styles.resultMeta}>{item.keyId} · {item.department}</Text></View><Icon name="chevron-right" size={17} color={C.mutedForeground} /></Pressable>) : <Text style={styles.searchHint}>Search by vehicle number or key ID to use the same key workflow.</Text>}
        </View>
        {incomingTransfer ? <PrimaryButton label="Exit incoming transfer" variant="ghost" onPress={() => { setIncomingTransfer(null); setView('tab'); setActiveTab('scanner'); }} /> : null}
      </ScrollView>
    </>
  );

  const renderKeys = () => (
    <>
      <Header title="My Keys" subtitle={`${myKeys.length} keys currently assigned`} right={<Pressable style={styles.headerBell} onPress={startBulkFlow}><Icon name="layers" size={20} color={C.primary} /></Pressable>} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.keyListHeader}><View><Text style={styles.keyListTotal}>Total Keys: {myKeys.length}</Text><Text style={styles.keyListHint}>Custody currently assigned to you</Text></View><Pressable style={styles.sortButton} onPress={() => Alert.alert('Sort keys', 'Newest is currently selected.', [{ text: 'Newest' }, { text: 'Oldest' }])}><Icon name="sliders" size={16} color={C.primary} /><Text style={styles.sortText}>Newest</Text></Pressable></View>
        <View style={styles.inputWrap}><Icon name="search" size={18} color={C.mutedForeground} /><TextInput value={search} onChangeText={setSearch} placeholder="Search vehicle or key ID" placeholderTextColor={C.mutedForeground} style={styles.input} /></View>
        {myKeys.length === 0 ? <EmptyState icon="key" title="No keys assigned" body="Transferred or delivered keys will leave this list immediately." /> : visibleKeys.filter((item) => item.custodian === CURRENT_USER).map((item) => <KeyCard key={item.id} item={item} onPress={() => openKey(item.id)} onTransfer={() => openSenderFlow(item.id)} onHistory={() => { setSelectedKeyId(item.id); setView('history'); }} />)}
      </ScrollView>
    </>
  );

  const renderNotifications = () => (
    <>
      <Header title="Notifications" subtitle={unreadCount ? `${unreadCount} unread requiring attention` : 'You’re all caught up'} right={<Pressable onPress={() => setNotifications((current) => current.map((item) => ({ ...item, unread: false })))}><Text style={styles.sectionAction}>Mark all read</Text></Pressable>} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.notificationSummary}><View style={styles.notificationSummaryIcon}><Icon name="bell" size={20} color={C.primary} /></View><View><Text style={styles.notificationSummaryTitle}>{unreadCount ? 'Action needed' : 'All clear'}</Text><Text style={styles.notificationSummaryBody}>{unreadCount ? 'Review the latest key-control updates.' : 'No pending notifications right now.'}</Text></View></View>
        <SectionLabel>Recent updates</SectionLabel>
        {notifications.map((item) => <Pressable key={item.id} onPress={() => item.incoming ? openIncoming() : undefined} style={({ pressed }) => [styles.notificationCard, item.unread && styles.unreadCard, { opacity: pressed ? 0.82 : 1 }]}><View style={[styles.notificationIcon, { backgroundColor: `${toneColor(item.tone)}14` }]}><Icon name={item.incoming ? 'arrow-down-left' : item.tone === 'red' ? 'alert-triangle' : item.tone === 'green' ? 'check' : 'file-text'} size={18} color={toneColor(item.tone)} /></View><View style={styles.notificationCopy}><View style={styles.notificationTitleRow}><Text style={styles.notificationTitle}>{item.title}</Text>{item.unread ? <View style={styles.unreadDot} /> : null}</View><Text style={styles.notificationBody}>{item.body}</Text><Text style={styles.notificationTime}>{item.time}</Text></View>{item.incoming ? <Icon name="chevron-right" size={17} color={C.mutedForeground} /> : null}</Pressable>)}
        <SectionLabel>Scheduled reports</SectionLabel>
        <Pressable style={styles.reportNotification} onPress={() => setView('report')}><View style={styles.reportIcon}><Icon name="bar-chart-2" size={18} color={C.destructive} /></View><View style={styles.notificationCopy}><Text style={styles.notificationTitle}>Missing Keys Report</Text><Text style={styles.notificationBody}>Reporting period · Last 3 days</Text><View style={styles.reportNumbers}><View><Text style={styles.reportNumber}>12</Text><Text style={styles.reportCaption}>missing keys</Text></View><View><Text style={styles.reportNumber}>₹24,000</Text><Text style={styles.reportCaption}>estimated cost</Text></View></View></View><Icon name="chevron-right" size={17} color={C.mutedForeground} /></Pressable>
      </ScrollView>
    </>
  );

  const renderProfile = () => (
    <>
      <Header title="Profile" subtitle="Your account and permissions" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}><View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>AP</Text></View><View><Text style={styles.profileName}>Amit Patel</Text><Text style={styles.profileRole}>Mechanic · Mechanical</Text><Pill label="Employee access" tone="green" dot /></View><Pressable style={styles.editIcon} onPress={() => Alert.alert('Profile', 'Profile editing is managed by your garage administrator.')}><Icon name="edit-2" size={17} color={C.primary} /></Pressable></View>
        <View style={styles.profileStats}><View><Text style={styles.profileStatValue}>{myKeys.length}</Text><Text style={styles.profileStatLabel}>Current keys</Text></View><View><Text style={styles.profileStatValue}>7</Text><Text style={styles.profileStatLabel}>Transfers today</Text></View><View><Text style={styles.profileStatValue}>{unreadCount}</Text><Text style={styles.profileStatLabel}>Notifications</Text></View></View>
        <SectionLabel>Manager tools</SectionLabel>
        <Pressable style={styles.managerCard} onPress={() => setView('report')}><View style={styles.managerIcon}><Icon name="pie-chart" size={19} color={C.purple} /></View><View style={styles.managerCopy}><Text style={styles.managerTitle}>Key-control overview</Text><Text style={styles.managerBody}>KPIs, missing key impact, and audit health</Text></View><Icon name="chevron-right" size={18} color={C.mutedForeground} /></Pressable>
        <SectionLabel>Account</SectionLabel>
        <View style={styles.settingsCard}><Pressable style={styles.settingRow} onPress={() => Alert.alert('Notifications', 'Notifications are enabled for incoming transfers and reports.')}><Icon name="bell" size={18} color={C.mutedForeground} /><Text style={styles.settingText}>Notification preferences</Text><Icon name="chevron-right" size={17} color={C.mutedForeground} /></Pressable><View style={styles.settingDivider} /><Pressable style={styles.settingRow} onPress={() => Alert.alert('Missing key form', MISSING_KEY_GOOGLE_FORM_URL || 'A Google Form URL will be connected by your garage administrator.')}><Icon name="external-link" size={18} color={C.mutedForeground} /><Text style={styles.settingText}>Missing-key report form</Text><Icon name="chevron-right" size={17} color={C.mutedForeground} /></Pressable><View style={styles.settingDivider} /><Pressable style={styles.settingRow} onPress={() => Alert.alert('Sign out', 'Sign out is disabled in this prototype.')}><Icon name="log-out" size={18} color={C.destructive} /><Text style={[styles.settingText, { color: C.destructive }]}>Log out</Text><Icon name="chevron-right" size={17} color={C.mutedForeground} /></Pressable></View>
        <Text style={styles.versionText}>Fleet Key Control · v1.0 prototype</Text>
      </ScrollView>
    </>
  );

  const renderKeyDetail = () => {
    if (!selectedKey) return null;
    const isOwner = selectedKey.custodian === CURRENT_USER;
    return (
      <>
        <Header title="Vehicle / Key" subtitle={selectedKey.vehicle} onBack={() => { setView('tab'); setActiveTab('keys'); }} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHero}><View style={styles.detailVehicleIcon}><Icon name="truck" size={27} color={C.primary} /></View><Text style={styles.detailVehicle}>{selectedKey.vehicle}</Text><Text style={styles.detailKeyId}>{selectedKey.keyId} · {selectedKey.department}</Text><Pill label={selectedKey.transferStatus} tone={selectedKey.transferStatus === 'Missing' ? 'red' : selectedKey.transferStatus === 'Transfer pending' ? 'amber' : 'green'} dot /></View>
          <View style={styles.detailInfoCard}><InfoRow label="Current custodian" value={selectedKey.custodian} icon="user" /><InfoRow label="Department" value={selectedKey.department} icon="briefcase" /><InfoRow label="Vehicle status" value={selectedKey.vehicleStatus} icon="truck" /><InfoRow label="Job card status" value={selectedKey.jobCard} icon="clipboard" last /></View>
          <SectionLabel>Key actions</SectionLabel>
          <View style={styles.detailActions}>
            <PrimaryButton label="Send Key" icon="send" onPress={() => openSenderFlow(selectedKey.id)} disabled={!isOwner || selectedKey.transferStatus === 'Transfer pending'} />
            <PrimaryButton label="Job Card Open" icon="unlock" variant="secondary" onPress={openJobCard} disabled={!isOwner || selectedKey.jobCard === 'Open'} />
            <PrimaryButton label="Job Card Close" icon="lock" variant="secondary" onPress={() => setView('job-close')} disabled={!isOwner || selectedKey.jobCard === 'Closed'} />
            <PrimaryButton label="I Don’t Have the Key" icon="alert-circle" variant="danger" onPress={() => setView('missing')} disabled={!isOwner} />
          </View>
          {!isOwner ? <View style={styles.permissionNote}><Icon name="info" size={16} color={C.warning} /><Text style={styles.permissionNoteText}>You can view this key, but only the current custodian can act on it.</Text></View> : null}
          <Pressable style={styles.auditLink} onPress={() => setView('history')}><Icon name="clock" size={17} color={C.primary} /><Text style={styles.auditLinkText}>View full key history</Text><Icon name="arrow-up-right" size={15} color={C.primary} /></Pressable>
        </ScrollView>
      </>
    );
  };

  const renderSendEmployee = () => (
    <>
      <Header title="Send Key" subtitle={selectedKey?.vehicle} onBack={() => setView('key-detail')} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.flowIntro}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View><View><Text style={styles.flowTitle}>Select employee</Text><Text style={styles.flowBody}>The key stays with you until they accept.</Text></View></View>
        <View style={styles.inputWrap}><Icon name="search" size={18} color={C.mutedForeground} /><TextInput value={search} onChangeText={setSearch} placeholder="Search employees" placeholderTextColor={C.mutedForeground} style={styles.input} /></View>
        {employees.filter((employee) => employee.name.toLowerCase().includes(search.toLowerCase())).map((employee) => <Pressable key={employee.name} onPress={() => setSelectedEmployee(employee)} style={[styles.employeeCard, selectedEmployee?.name === employee.name && styles.employeeCardSelected]}><View style={styles.avatar}><Text style={styles.avatarText}>{employee.initials}</Text></View><View style={styles.employeeCopy}><Text style={styles.employeeName}>{employee.name}</Text><Text style={styles.employeeMeta}>{employee.department} · {employee.role}</Text></View><View style={styles.employeeKeys}><Text style={styles.employeeKeyCount}>{employee.keys}</Text><Text style={styles.employeeKeyLabel}>keys</Text></View>{selectedEmployee?.name === employee.name ? <View style={styles.selectedCheck}><Icon name="check" size={14} color={C.primaryForeground} /></View> : null}</Pressable>)}
        <View style={styles.purposeSection}><Text style={styles.purposeTitle}>Purpose of transfer</Text><Text style={styles.purposeHint}>Help the receiver understand why the key is moving.</Text><View style={styles.purposeGrid}>{transferPurposes.map((purpose) => <Pressable key={purpose.value} onPress={() => setSelectedPurpose(purpose.value)} style={[styles.purposeCard, selectedPurpose === purpose.value && styles.purposeCardSelected]}><View style={[styles.purposeIcon, selectedPurpose === purpose.value && styles.purposeIconSelected]}><Icon name={purpose.icon} size={17} color={selectedPurpose === purpose.value ? C.primaryForeground : C.primary} /></View><Text style={styles.purposeName}>{purpose.value}</Text><Text style={styles.purposeDescription}>{purpose.description}</Text>{selectedPurpose === purpose.value ? <View style={styles.purposeCheck}><Icon name="check" size={11} color={C.primaryForeground} /></View> : null}</Pressable>)}</View></View>
        <View style={styles.stickyAction}><PrimaryButton label="Transfer Key" icon="send" onPress={startTransfer} disabled={!selectedEmployee || !selectedPurpose} /></View>
      </ScrollView>
    </>
  );

  const renderPending = () => {
    if (!activeTransfer) return null;
    const isBulk = activeTransfer.kind === 'bulk';
    return (
      <>
        <Header title="Transfer Pending" subtitle={isBulk ? `${activeTransfer.keyIds.length} keys in one request` : activeTransfer.vehicle} onBack={() => { setView('tab'); setActiveTab('keys'); }} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.pendingCard}><View style={styles.pendingIcon}><Icon name="clock" size={25} color={C.warning} /></View><Text style={styles.pendingTitle}>Waiting for acceptance</Text><Text style={styles.pendingBody}>The current custodian remains the owner until the receiver scans and accepts.</Text><View style={styles.timerCircle}><Text style={styles.timerText}>{formatTimer(activeTransfer.remaining)}</Text><Text style={styles.timerLabel}>TIME LEFT</Text></View><View style={styles.pendingMeta}><InfoRow label={isBulk ? 'Keys' : 'Vehicle number'} value={isBulk ? `${activeTransfer.keyIds.length} selected` : activeTransfer.vehicle} icon={isBulk ? 'layers' : 'truck'} /><InfoRow label="Purpose" value={activeTransfer.purpose} icon="tag" /><InfoRow label="Sending to" value={activeTransfer.recipient.name} icon="user" /><InfoRow label="Department" value={activeTransfer.recipient.department} icon="briefcase" last /></View></View>
          {isBulk ? <View style={styles.bulkVerifyCard}><View><Text style={styles.bulkVerifyTitle}>{activeTransfer.keyIds.length} keys pending</Text><Text style={styles.bulkVerifyBody}>Receiver scans each key QR code</Text></View><Pill label="0 verified" tone="amber" /></View> : null}
          <View style={styles.waitingNote}><Icon name="shield" size={17} color={C.primary} /><Text style={styles.waitingNoteText}>Waiting for {activeTransfer.recipient.name} to scan the QR code and accept the transfer.</Text></View>
          <PrimaryButton label="Cancel Transfer" icon="x-circle" variant="danger" onPress={cancelTransfer} />
          <View style={styles.demoDivider}><Text style={styles.demoDividerText}>Prototype demo controls</Text></View>
          <PrimaryButton label="Open receiver preview" icon="eye" variant="ghost" onPress={previewReceiver} />
          <View style={styles.demoOutcomeRow}><Pressable onPress={() => finishSenderDemo('complete')}><Text style={styles.demoOutcomeSuccess}>Simulate accept</Text></Pressable><Pressable onPress={() => finishSenderDemo('rejected')}><Text style={styles.demoOutcomeDanger}>Simulate reject</Text></Pressable></View>
        </ScrollView>
      </>
    );
  };

  const renderScanTransfer = () => (
    <>
      <Header title="Verify transfer" subtitle="Receiver step" onBack={() => { setIncomingTransfer(null); setView('tab'); setActiveTab('notifications'); }} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.flowProgress}><View style={styles.progressDone}><Icon name="check" size={14} color={C.primaryForeground} /></View><View style={styles.progressLineActive} /><View style={styles.progressCurrent}><Text style={styles.progressCurrentText}>2</Text></View><View style={styles.progressLine} /><View style={styles.progressNext}><Text style={styles.progressNextText}>3</Text></View></View>
        <Text style={styles.progressLabels}><Text style={styles.progressLabelActive}>Notification</Text><Text>  →  Scan key  →  Accept</Text></Text>
        <View style={styles.scannerCard}><Text style={styles.scannerKicker}>INCOMING KEY TRANSFER</Text><Text style={styles.scannerTitle}>Scan the physical key</Text><Text style={styles.scannerBody}>This verification step confirms the key in your hand matches the transfer request.</Text><View style={styles.qrFrame}><View style={[styles.corner, styles.cornerTL]} /><View style={[styles.corner, styles.cornerTR]} /><View style={[styles.corner, styles.cornerBL]} /><View style={[styles.corner, styles.cornerBR]} /><View style={styles.fakeQr}><View style={styles.qrBlock} /><View style={[styles.qrBlock, styles.qrBlockSmall]} /><View style={[styles.qrBlock, styles.qrBlockWide]} /><View style={[styles.qrBlock, styles.qrBlockTiny]} /></View><View style={styles.scanLine} /></View><PrimaryButton label="Simulate QR scan" icon="maximize" onPress={() => setView('incoming-detail')} /></View>
        <View style={styles.transferMiniCard}><View style={styles.resultIcon}><Icon name="truck" size={17} color={C.primary} /></View><View style={styles.keyCardCopy}><Text style={styles.resultVehicle}>{incomingTransfer?.vehicle}</Text><Text style={styles.resultMeta}>From {incomingTransfer?.sender} · {incomingTransfer?.senderDepartment}</Text><Text style={styles.transferPurposeText}>Purpose · {incomingTransfer?.purpose}</Text></View><Pill label={incomingTransfer ? formatTimer(incomingTransfer.remaining) : '02:00'} tone="amber" /></View>
      </ScrollView>
    </>
  );

  const renderIncomingDetail = () => (
    <>
      <Header title="Incoming Key Transfer" subtitle="QR verified successfully" onBack={() => setView('scan-transfer')} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.verifiedBanner}><View style={styles.verifiedIcon}><Icon name="check" size={21} color={C.success} /></View><View><Text style={styles.verifiedTitle}>Key verified</Text><Text style={styles.verifiedBody}>The QR code matches this transfer request.</Text></View></View>
        <View style={styles.incomingDetailHero}><Text style={styles.detailVehicle}>{incomingTransfer?.vehicle}</Text><Text style={styles.detailKeyId}>Incoming from {incomingTransfer?.sender}</Text><Pill label="Transfer pending" tone="amber" dot /></View>
        <View style={styles.detailInfoCard}><InfoRow label="Sender" value={incomingTransfer?.sender ?? ''} icon="user" /><InfoRow label="Sender department" value={incomingTransfer?.senderDepartment ?? ''} icon="briefcase" /><InfoRow label="Purpose" value={incomingTransfer?.purpose ?? ''} icon="tag" /><InfoRow label="Current custodian" value={incomingTransfer?.sender ?? ''} icon="key" /><InfoRow label="Initiated" value={incomingTransfer?.startedAt ?? ''} icon="clock" last /></View>
        <View style={styles.expirationNote}><Icon name="clock" size={16} color={C.warning} /><Text style={styles.expirationText}>Expires in {formatTimer(incomingTransfer?.remaining ?? 0)}. Ownership changes only if you accept.</Text></View>
        <View style={styles.acceptReject}><PrimaryButton label="Accept" icon="check-circle" onPress={acceptIncoming} testID="accept-transfer-button" /><PrimaryButton label="Reject" icon="x-circle" variant="danger" onPress={rejectIncoming} testID="reject-transfer-button" /></View>
      </ScrollView>
    </>
  );

  const renderOutcome = () => {
    const content: Record<OutcomeType, { icon: React.ComponentProps<typeof Feather>['name']; tone: 'green' | 'red' | 'amber' | 'blue'; title: string; body: string; detail: string }> = {
      complete: { icon: 'check', tone: 'green', title: 'Transfer Complete', body: incomingTransfer ? `You are now the custodian of ${incomingTransfer.vehicle}.` : `The key has been successfully transferred to ${activeTransfer?.recipient.name ?? 'the receiver'}.`, detail: incomingTransfer ? `Previous custodian · ${incomingTransfer.sender}` : `New custodian · ${activeTransfer?.recipient.name ?? 'Receiver'}` },
      rejected: { icon: 'x', tone: 'red', title: 'Transfer Unsuccessful', body: incomingTransfer ? `You rejected the transfer for ${incomingTransfer.vehicle}.` : `${activeTransfer?.recipient.name ?? 'The receiver'} rejected the key transfer.`, detail: 'The sender remains the custodian.' },
      expired: { icon: 'clock', tone: 'amber', title: 'Transfer Expired', body: 'The transfer expired because the receiver did not respond within 2 minutes.', detail: 'The sender remains the custodian.' },
      cancelled: { icon: 'x', tone: 'amber', title: 'Transfer Cancelled', body: 'The transfer was cancelled before the receiver accepted it.', detail: 'The sender remains the custodian.' },
      opened: { icon: 'unlock', tone: 'blue', title: 'Job Card Opened Successfully', body: `${selectedKey?.vehicle ?? 'Vehicle'} is now inside the garage and ready for work.`, detail: 'Job card status · Open' },
      delivered: { icon: 'check', tone: 'green', title: 'Vehicle Delivered Successfully', body: `${selectedKey?.vehicle ?? 'Vehicle'} has been marked outside the garage.`, detail: 'The key was removed from My Keys.' },
    };
    const item = content[outcome];
    return (
      <>
        <Header title="Result" subtitle="Action recorded" onBack={() => { setView('tab'); setActiveTab('home'); setIncomingTransfer(null); }} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.outcomeCard}><View style={[styles.outcomeIcon, { backgroundColor: `${toneColor(item.tone)}16` }]}><Icon name={item.icon} size={29} color={toneColor(item.tone)} /></View><Text style={styles.outcomeTitle}>{item.title}</Text><Text style={styles.outcomeBody}>{item.body}</Text><View style={styles.outcomeDetail}><Text style={styles.outcomeDetailLabel}>{outcome === 'complete' && incomingTransfer ? 'TRANSFER TIME' : 'STATUS'}</Text><Text style={styles.outcomeDetailValue}>{outcome === 'complete' && incomingTransfer ? `${nowLabel()} · Purpose · ${incomingTransfer.purpose}` : `${item.detail} · Purpose · ${incomingTransfer?.purpose ?? activeTransfer?.purpose ?? '—'}`}</Text></View></View>
          <PrimaryButton label="Back to Home" icon="home" onPress={() => { setView('tab'); setActiveTab('home'); setIncomingTransfer(null); }} />
          <PrimaryButton label="View Notifications" icon="bell" variant="ghost" onPress={() => { setView('tab'); setActiveTab('notifications'); setIncomingTransfer(null); }} />
        </ScrollView>
      </>
    );
  };

  const renderHistory = () => {
    if (!selectedKey) return null;
    return (
      <>
        <Header title="Key History" subtitle={selectedKey.vehicle} onBack={() => setView('key-detail')} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.historySummary}><View style={styles.detailVehicleIcon}><Icon name="key" size={22} color={C.primary} /></View><View><Text style={styles.historyVehicle}>{selectedKey.vehicle}</Text><Text style={styles.historyCurrent}>Current custodian · {selectedKey.custodian}</Text></View></View>
          <SectionLabel>Audit trail</SectionLabel>
          <View style={styles.timeline}>{selectedKey.history.map((event, index) => <View key={`${event.title}-${event.time}`} style={styles.timelineRow}><View style={styles.timelineRail}>{<View style={[styles.timelineDot, { backgroundColor: toneColor(event.tone) }]} />}{index < selectedKey.history.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{event.title}</Text><Text style={styles.timelineDetail}>{event.detail}</Text><Text style={styles.timelineTime}>{event.time}</Text></View></View>)}</View>
          <View style={styles.auditTrust}><Icon name="shield" size={18} color={C.primary} /><Text style={styles.auditTrustText}>This timeline is the source of truth for who had the key and when.</Text></View>
        </ScrollView>
      </>
    );
  };

  const renderBulkSelect = () => (
    <>
      <Header title="Bulk Send" subtitle="Select keys to move together" onBack={() => { setView('tab'); setActiveTab('home'); }} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.flowIntro}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View><View><Text style={styles.flowTitle}>Choose keys</Text><Text style={styles.flowBody}>Send multiple keys to the same employee.</Text></View></View>
        {myKeys.map((item) => <Pressable key={item.id} onPress={() => toggleBulk(item.id)} style={[styles.bulkKeyCard, selectedBulkIds.includes(item.id) && styles.bulkKeyCardSelected]}><View style={[styles.checkbox, selectedBulkIds.includes(item.id) && styles.checkboxSelected]}>{selectedBulkIds.includes(item.id) ? <Icon name="check" size={15} color={C.primaryForeground} /> : null}</View><View style={styles.vehicleGlyph}><Icon name="truck" size={19} color={C.primary} /></View><View style={styles.keyCardCopy}><Text style={styles.vehicleNumber}>{item.vehicle}</Text><Text style={styles.keyMeta}>{item.department} · {item.keyId}</Text></View><Pill label={item.jobCard} tone={item.jobCard === 'Open' ? 'blue' : 'gray'} /></Pressable>)} 
        {selectedBulkIds.length === 0 ? <Text style={styles.selectionHint}>Select at least one key to continue.</Text> : null}
        <View style={styles.stickyAction}><PrimaryButton label={`Continue · ${selectedBulkIds.length} selected`} icon="arrow-right" onPress={() => setView('bulk-recipient')} disabled={selectedBulkIds.length === 0} /></View>
      </ScrollView>
    </>
  );

  const renderBulkRecipient = () => (
    <>
      <Header title="Bulk Send" subtitle={`${selectedBulkIds.length} keys selected`} onBack={() => setView('bulk-select')} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.flowIntro}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View><View><Text style={styles.flowTitle}>Select receiver</Text><Text style={styles.flowBody}>All selected keys will go to one employee.</Text></View></View>
        {employees.map((employee) => <Pressable key={employee.name} onPress={() => setSelectedEmployee(employee)} style={[styles.employeeCard, selectedEmployee?.name === employee.name && styles.employeeCardSelected]}><View style={styles.avatar}><Text style={styles.avatarText}>{employee.initials}</Text></View><View style={styles.employeeCopy}><Text style={styles.employeeName}>{employee.name}</Text><Text style={styles.employeeMeta}>{employee.department} · {employee.role}</Text></View><Text style={styles.employeeKeyCount}>{employee.keys} keys</Text>{selectedEmployee?.name === employee.name ? <View style={styles.selectedCheck}><Icon name="check" size={14} color={C.primaryForeground} /></View> : null}</Pressable>)}
        <View style={styles.purposeSection}><Text style={styles.purposeTitle}>Purpose of transfer</Text><Text style={styles.purposeHint}>Apply one purpose to all selected keys.</Text><View style={styles.purposeGrid}>{transferPurposes.map((purpose) => <Pressable key={purpose.value} onPress={() => setSelectedPurpose(purpose.value)} style={[styles.purposeCard, selectedPurpose === purpose.value && styles.purposeCardSelected]}><View style={[styles.purposeIcon, selectedPurpose === purpose.value && styles.purposeIconSelected]}><Icon name={purpose.icon} size={17} color={selectedPurpose === purpose.value ? C.primaryForeground : C.primary} /></View><Text style={styles.purposeName}>{purpose.value}</Text><Text style={styles.purposeDescription}>{purpose.description}</Text>{selectedPurpose === purpose.value ? <View style={styles.purposeCheck}><Icon name="check" size={11} color={C.primaryForeground} /></View> : null}</Pressable>)}</View></View>
        <PrimaryButton label="Review transfer" icon="arrow-right" onPress={() => setView('bulk-summary')} disabled={!selectedEmployee || !selectedPurpose} />
      </ScrollView>
    </>
  );

  const renderBulkSummary = () => {
    const chosenKeys = keys.filter((item) => selectedBulkIds.includes(item.id));
    return (
      <>
        <Header title="Review bulk transfer" subtitle="Confirm before sending" onBack={() => setView('bulk-recipient')} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}><View style={styles.summaryTop}><View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View><View><Text style={styles.flowTitle}>{selectedBulkIds.length} keys selected</Text><Text style={styles.flowBody}>Sending to {selectedEmployee?.name}</Text></View></View><View style={styles.summaryPurpose}><Icon name="tag" size={15} color={C.primary} /><Text style={styles.summaryPurposeText}>Purpose · {selectedPurpose}</Text></View>{chosenKeys.map((item) => <View key={item.id} style={styles.summaryRow}><Icon name="truck" size={16} color={C.primary} /><Text style={styles.summaryVehicle}>{item.vehicle}</Text><Text style={styles.summaryDepartment}>{item.department}</Text></View>)}</View>
          <View style={styles.waitingNote}><Icon name="shield" size={17} color={C.primary} /><Text style={styles.waitingNoteText}>The receiver must scan each selected key. Ownership changes only for verified keys they accept.</Text></View>
          <PrimaryButton label="Send Keys" icon="send" onPress={startBulkTransfer} />
        </ScrollView>
      </>
    );
  };

  const renderJobOpen = () => (
    <>
      <Header title="Open Job Card" subtitle="Confirm vehicle arrival" onBack={() => setView('key-detail')} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}><View style={styles.confirmCard}><View style={styles.confirmIcon}><Icon name="unlock" size={24} color={C.primary} /></View><Text style={styles.confirmTitle}>Open job card</Text><Text style={styles.confirmBody}>Mark this vehicle as inside the garage and ready for work.</Text><View style={styles.confirmMeta}><InfoRow label="Vehicle" value={selectedKey?.vehicle ?? ''} icon="truck" /><InfoRow label="Department" value={selectedKey?.department ?? ''} icon="briefcase" last /></View><PrimaryButton label="Open Job Card" icon="unlock" onPress={confirmOpenJobCard} /></View></ScrollView>
    </>
  );

  const renderJobClose = () => (
    <>
      <Header title="Close Job Card" subtitle="Confirm vehicle delivery" onBack={() => setView('key-detail')} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}><View style={styles.confirmCard}><View style={[styles.confirmIcon, { backgroundColor: `${C.success}14` }]}><Icon name="lock" size={24} color={C.success} /></View><Text style={styles.confirmTitle}>Close job card</Text><Text style={styles.confirmBody}>This will mark the vehicle outside the garage and remove the key from My Keys.</Text><View style={styles.confirmMeta}><InfoRow label="Vehicle" value={selectedKey?.vehicle ?? ''} icon="truck" /><InfoRow label="Repair duration" value="2h 48m" icon="clock" /><InfoRow label="Total transfers" value="3" icon="repeat" last /></View><PrimaryButton label="Close Job Card" icon="lock" onPress={confirmCloseJobCard} /></View></ScrollView>
    </>
  );

  const renderMissing = () => (
    <>
      <Header title="Missing key report" subtitle={selectedKey?.vehicle} onBack={() => setView('key-detail')} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}><View style={styles.missingCard}><View style={styles.missingIcon}><Icon name="alert-triangle" size={24} color={C.destructive} /></View><Text style={styles.confirmTitle}>I don’t have the key</Text><Text style={styles.confirmBody}>Report that this assigned key is missing or unavailable. The incident form captures the employee, department, vehicle, key ID, last known location, and notes.</Text><View style={styles.incidentFields}><InfoRow label="Employee" value={CURRENT_USER} icon="user" /><InfoRow label="Department" value="Mechanical" icon="briefcase" /><InfoRow label="Vehicle" value={selectedKey?.vehicle ?? ''} icon="truck" /><InfoRow label="Key ID" value={selectedKey?.keyId ?? ''} icon="key" last /></View><PrimaryButton label="Open missing-key form" icon="external-link" onPress={() => { if (MISSING_KEY_GOOGLE_FORM_URL) Linking.openURL(MISSING_KEY_GOOGLE_FORM_URL); else Alert.alert('Form not configured', 'Connect the garage’s Google Form URL in MISSING_KEY_GOOGLE_FORM_URL before using this action.'); }} /><Text style={styles.formNote}>This prototype uses a configurable Google Form destination. No fake URL is embedded.</Text></View></ScrollView>
    </>
  );

  const renderReport = () => {
    const cost = Number(replacementCost.replace(/[^0-9]/g, '')) || 0;
    const missingKeys = keys.filter((item) => item.transferStatus === 'Missing').length + 11;
    return (
      <>
        <Header title="Key-control overview" subtitle="Manager reporting" onBack={() => { setView('tab'); setActiveTab('profile'); }} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.reportHero}><View><Text style={styles.eyebrow}>LAST 3 DAYS</Text><Text style={styles.reportHeroTitle}>Garage control health</Text><Text style={styles.reportHeroBody}>A quick view of custody, transfers, and missing-key impact.</Text></View><Icon name="pie-chart" size={32} color={C.primaryForeground} /></View>
          <View style={styles.kpiGrid}><Kpi value="48" label="Total keys" tone="blue" /><Kpi value="31" label="Assigned" tone="green" /><Kpi value="3" label="In transfer" tone="amber" /><Kpi value={String(missingKeys)} label="Missing" tone="red" /></View>
          <View style={styles.reportPanel}><Text style={styles.panelTitle}>Missing-key financial impact</Text><Text style={styles.panelSubtitle}>Change the replacement value to model exposure.</Text><View style={styles.costRow}><View><Text style={styles.costLabel}>Cost per key</Text><View style={styles.costInputWrap}><Text style={styles.rupee}>₹</Text><TextInput value={replacementCost} onChangeText={setReplacementCost} keyboardType="numeric" style={styles.costInput} /></View></View><View style={styles.costResult}><Text style={styles.costLabel}>Estimated total</Text><Text style={styles.costTotal}>₹{(missingKeys * cost).toLocaleString('en-IN')}</Text></View></View></View>
          <View style={styles.reportPanel}><Text style={styles.panelTitle}>Transfer outcomes</Text><ReportBar label="Completed" value="7" percent={72} tone={C.success} /><ReportBar label="Rejected" value="1" percent={14} tone={C.destructive} /><ReportBar label="Expired" value="1" percent={14} tone={C.warning} /></View>
          <View style={styles.reportPanel}><Text style={styles.panelTitle}>Missing keys by area</Text><ReportBar label="Mechanical" value="6" percent={50} tone={C.primary} /><ReportBar label="Body Shop" value="4" percent={33} tone={C.purple} /><ReportBar label="Electrical" value="2" percent={17} tone={C.warning} /></View>
          <Text style={styles.reportFootnote}>Recipients: Garage Manager · Operations Manager · Regional Operations</Text>
        </ScrollView>
      </>
    );
  };

  if (view !== 'tab') {
    let content: React.ReactNode = null;
    if (view === 'key-detail') content = renderKeyDetail();
    if (view === 'send-employee') content = renderSendEmployee();
    if (view === 'pending') content = renderPending();
    if (view === 'outcome') content = renderOutcome();
    if (view === 'scan-transfer') content = renderScanTransfer();
    if (view === 'incoming-detail') content = renderIncomingDetail();
    if (view === 'history') content = renderHistory();
    if (view === 'bulk-select') content = renderBulkSelect();
    if (view === 'bulk-recipient') content = renderBulkRecipient();
    if (view === 'bulk-summary') content = renderBulkSummary();
    if (view === 'job-open') content = renderJobOpen();
    if (view === 'job-close') content = renderJobClose();
    if (view === 'missing') content = renderMissing();
    if (view === 'report') content = renderReport();
    return <View style={styles.app}><StatusBar barStyle="dark-content" backgroundColor={C.background} />{content}</View>;
  }

  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <View style={styles.content}>{activeTab === 'home' ? renderHome() : activeTab === 'scanner' ? renderScanner() : activeTab === 'keys' ? renderKeys() : activeTab === 'notifications' ? renderNotifications() : renderProfile()}</View>
      <View style={[styles.tabBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 }]}>
        <TabButton label="Home" icon="home" active={activeTab === 'home'} onPress={() => goTab('home')} />
        <TabButton label="Scanner" icon="maximize" active={activeTab === 'scanner'} onPress={() => goTab('scanner')} />
        <TabButton label="My Keys" icon="key" active={activeTab === 'keys'} onPress={() => goTab('keys')} />
        <TabButton label="Alerts" icon="bell" active={activeTab === 'notifications'} onPress={() => goTab('notifications')} badge={unreadCount} />
        <TabButton label="Profile" icon="user" active={activeTab === 'profile'} onPress={() => goTab('profile')} />
      </View>
    </View>
  );
}

function InfoRow({ label, value, icon, last = false }: { label: string; value: string; icon: React.ComponentProps<typeof Feather>['name']; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}><View style={styles.infoIcon}><Icon name={icon} size={15} color={C.mutedForeground} /></View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
  );
}

function TabButton({ label, icon, active, onPress, badge = 0 }: { label: string; icon: React.ComponentProps<typeof Feather>['name']; active: boolean; onPress: () => void; badge?: number }) {
  return <Pressable onPress={onPress} style={styles.tabButton}><View style={[styles.tabIconWrap, active && styles.tabIconActive]}><Icon name={icon} size={19} color={active ? C.primary : C.mutedForeground} />{badge > 0 ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View> : null}</View><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text></Pressable>;
}

function Kpi({ value, label, tone }: { value: string; label: string; tone: 'blue' | 'green' | 'amber' | 'red' }) {
  return <View style={[styles.kpiCard, { borderTopColor: toneColor(tone) }]}><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiLabel}>{label}</Text></View>;
}

function ReportBar({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: string }) {
  return <View style={styles.reportBarRow}><View style={styles.reportBarLabel}><Text style={styles.reportBarName}>{label}</Text><Text style={styles.reportBarValue}>{value}</Text></View><View style={styles.reportBarTrack}><View style={[styles.reportBarFill, { width: `${percent}%`, backgroundColor: tone }]} /></View></View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.background },
  content: { flex: 1 },
  header: { backgroundColor: C.background, paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  backButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerCopy: { flex: 1 },
  headerTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, letterSpacing: -0.4 },
  headerSubtitle: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  headerBell: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: C.destructive, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.background },
  headerBadgeText: { color: C.primaryForeground, fontSize: 9, fontFamily: 'Inter_700Bold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 3, gap: 16 },
  heroCard: { backgroundColor: C.primary, borderRadius: 24, padding: 22, minHeight: 152, flexDirection: 'row', overflow: 'hidden', alignItems: 'center' },
  heroCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: `${C.primaryForeground}A8`, fontFamily: 'Inter_700Bold', letterSpacing: 1.3, fontSize: 10 },
  heroTitle: { color: C.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 30, letterSpacing: -0.8, marginTop: 8 },
  heroBody: { color: `${C.primaryForeground}C7`, fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 8 },
  heroGraphic: { width: 74, height: 74, borderRadius: 23, backgroundColor: `${C.primaryForeground}20`, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  heroPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.success, position: 'absolute', right: 13, top: 13, borderWidth: 2, borderColor: C.primary },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionLabel: { fontFamily: 'Inter_700Bold', color: C.foreground, fontSize: 15, letterSpacing: -0.1 },
  sectionAction: { color: C.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: C.border, minHeight: 116 },
  statIcon: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.8 },
  statLabel: { color: C.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2, lineHeight: 14 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '48%', backgroundColor: C.card, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: C.border, minHeight: 116 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  quickTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  quickSubtitle: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  incomingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${C.warning}10`, borderRadius: 17, borderWidth: 1, borderColor: `${C.warning}35`, padding: 13, gap: 11 },
  incomingIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: `${C.warning}18`, alignItems: 'center', justifyContent: 'center' },
  incomingCopy: { flex: 1 },
  inlineTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  incomingTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  incomingBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.15 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  keyCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  keyCardMain: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 11 },
  vehicleGlyph: { width: 38, height: 38, borderRadius: 13, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  keyCardCopy: { flex: 1 },
  vehicleLine: { flexDirection: 'row', gap: 7, alignItems: 'center', flexWrap: 'wrap' },
  vehicleNumber: { fontFamily: 'Inter_700Bold', color: C.foreground, fontSize: 13 },
  keyMeta: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  keyStatusRow: { flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: C.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 },
  keyCardFooter: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  receivedText: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 },
  cardActions: { flexDirection: 'row', gap: 13 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallActionText: { color: C.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  demoPill: { backgroundColor: `${C.success}12`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', gap: 5, alignItems: 'center' },
  demoPillText: { color: C.success, fontFamily: 'Inter_700Bold', fontSize: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  scannerCard: { backgroundColor: C.card, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: C.border },
  scannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerKicker: { color: C.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 },
  scannerTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, marginTop: 12, letterSpacing: -0.5 },
  scannerBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 6 },
  qrFrame: { height: 236, borderRadius: 18, backgroundColor: '#182c48', marginVertical: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  corner: { position: 'absolute', width: 27, height: 27, borderColor: '#8db9ff' },
  cornerTL: { top: 32, left: 32, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 32, right: 32, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 32, left: 32, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 32, right: 32, borderBottomWidth: 3, borderRightWidth: 3 },
  fakeQr: { width: 98, height: 98, backgroundColor: '#ffffff', padding: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignContent: 'flex-start' },
  qrBlock: { width: 25, height: 25, backgroundColor: '#182c48' },
  qrBlockSmall: { width: 17, height: 17, marginTop: 4 },
  qrBlockWide: { width: 38, height: 17, marginTop: 4 },
  qrBlockTiny: { width: 14, height: 28, marginLeft: 4 },
  scanLine: { position: 'absolute', height: 2, width: '65%', backgroundColor: '#7fb0ff', top: '50%', opacity: 0.9 },
  scannerNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 3 },
  scannerNoteText: { flex: 1, color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  searchCard: { backgroundColor: C.card, borderRadius: 17, padding: 12, borderWidth: 1, borderColor: C.border },
  inputWrap: { height: 46, borderWidth: 1, borderColor: C.input, borderRadius: 13, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 8 },
  input: { flex: 1, color: C.foreground, fontFamily: 'Inter_400Regular', fontSize: 13, paddingVertical: 0 },
  searchHint: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, padding: 8 },
  searchResult: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  resultIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  resultVehicle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  resultMeta: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  keyListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  keyListTotal: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
  keyListHint: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  sortText: { color: C.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  notificationSummary: { backgroundColor: `${C.primary}10`, borderRadius: 17, padding: 15, flexDirection: 'row', gap: 11, alignItems: 'center' },
  notificationSummaryIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: `${C.primary}18`, alignItems: 'center', justifyContent: 'center' },
  notificationSummaryTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  notificationSummaryBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  notificationCard: { backgroundColor: C.card, borderRadius: 17, borderWidth: 1, borderColor: C.border, padding: 13, flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  unreadCard: { borderColor: `${C.primary}50`, backgroundColor: '#fbfdff' },
  notificationIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationCopy: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  notificationTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  notificationBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4 },
  notificationTime: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 7 },
  reportNotification: { backgroundColor: `${C.destructive}08`, borderRadius: 17, borderWidth: 1, borderColor: `${C.destructive}27`, padding: 13, flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  reportIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: `${C.destructive}14`, alignItems: 'center', justifyContent: 'center' },
  reportNumbers: { flexDirection: 'row', gap: 25, marginTop: 11 },
  reportNumber: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
  reportCaption: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  profileCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarLarge: { width: 58, height: 58, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: C.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 19 },
  profileName: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
  profileRole: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3, marginBottom: 7 },
  editIcon: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${C.primary}10` },
  profileStats: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 17, borderWidth: 1, borderColor: C.border, padding: 15, justifyContent: 'space-around' },
  profileStatValue: { textAlign: 'center', color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 20 },
  profileStatLabel: { textAlign: 'center', color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  managerCard: { backgroundColor: `${C.purple}0D`, borderRadius: 17, borderWidth: 1, borderColor: `${C.purple}30`, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  managerIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: `${C.purple}16`, alignItems: 'center', justifyContent: 'center' },
  managerCopy: { flex: 1 },
  managerTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  managerBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  settingsCard: { backgroundColor: C.card, borderRadius: 17, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 52 },
  settingText: { flex: 1, color: C.foreground, fontFamily: 'Inter_500Medium', fontSize: 12 },
  settingDivider: { height: 1, backgroundColor: C.border },
  versionText: { textAlign: 'center', color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 8 },
  detailHero: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: 22 },
  detailVehicleIcon: { width: 55, height: 55, borderRadius: 18, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailVehicle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, letterSpacing: -0.5 },
  detailKeyId: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 5, marginBottom: 11 },
  detailInfoCard: { backgroundColor: C.card, borderRadius: 17, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14 },
  infoRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: { width: 23, alignItems: 'center' },
  infoLabel: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1 },
  infoValue: { color: C.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'right', maxWidth: '52%' },
  detailActions: { gap: 10 },
  primaryButton: { minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  ghostButton: { borderWidth: 1, borderColor: `${C.primary}45`, backgroundColor: 'transparent' },
  dangerButton: { borderWidth: 1, borderColor: `${C.destructive}34` },
  permissionNote: { backgroundColor: `${C.warning}10`, borderRadius: 12, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'center' },
  permissionNoteText: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1, lineHeight: 16 },
  auditLink: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  auditLinkText: { color: C.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  flowIntro: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 2 },
  stepBadge: { width: 32, height: 32, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { color: C.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  flowTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 15 },
  flowBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  employeeCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  employeeCardSelected: { borderColor: C.primary, backgroundColor: `${C.primary}08` },
  avatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.primary, fontFamily: 'Inter_700Bold', fontSize: 11 },
  employeeCopy: { flex: 1 },
  employeeName: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  employeeMeta: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  employeeKeys: { alignItems: 'flex-end' },
  employeeKeyCount: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 },
  employeeKeyLabel: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 9 },
  selectedCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  purposeSection: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, gap: 4 },
  purposeTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  purposeHint: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginBottom: 7 },
  purposeGrid: { flexDirection: 'row', gap: 7 },
  purposeCard: { flex: 1, minHeight: 91, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, padding: 9, position: 'relative' },
  purposeCardSelected: { borderColor: C.primary, backgroundColor: `${C.primary}09` },
  purposeIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  purposeIconSelected: { backgroundColor: C.primary },
  purposeName: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 11 },
  purposeDescription: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 8, lineHeight: 11, marginTop: 3 },
  purposeCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 7, right: 7 },
  stickyAction: { marginTop: 5 },
  pendingCard: { backgroundColor: C.card, borderRadius: 23, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center' },
  pendingIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: `${C.warning}15`, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, marginTop: 14 },
  pendingBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  timerCircle: { width: 142, height: 142, borderRadius: 71, borderWidth: 8, borderColor: `${C.warning}35`, borderTopColor: C.warning, alignItems: 'center', justifyContent: 'center', marginVertical: 19 },
  timerText: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -1 },
  timerLabel: { color: C.warning, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  pendingMeta: { alignSelf: 'stretch', backgroundColor: C.background, borderRadius: 14, paddingHorizontal: 12 },
  waitingNote: { flexDirection: 'row', gap: 8, backgroundColor: `${C.primary}0D`, borderRadius: 13, padding: 12, alignItems: 'flex-start' },
  waitingNoteText: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, flex: 1 },
  demoDivider: { alignItems: 'center', marginTop: 3 },
  demoDividerText: { color: C.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.3 },
  demoOutcomeRow: { flexDirection: 'row', justifyContent: 'center', gap: 26 },
  demoOutcomeSuccess: { color: C.success, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  demoOutcomeDanger: { color: C.destructive, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  bulkVerifyCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bulkVerifyTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  bulkVerifyBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  flowProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  progressDone: { width: 27, height: 27, borderRadius: 14, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  progressCurrent: { width: 27, height: 27, borderRadius: 14, borderWidth: 2, borderColor: C.primary, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  progressCurrentText: { color: C.primary, fontFamily: 'Inter_700Bold', fontSize: 11 },
  progressNext: { width: 27, height: 27, borderRadius: 14, backgroundColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  progressNextText: { color: C.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 11 },
  progressLineActive: { width: 46, height: 2, backgroundColor: C.success },
  progressLine: { width: 46, height: 2, backgroundColor: C.border },
  progressLabels: { textAlign: 'center', color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 },
  progressLabelActive: { color: C.success, fontFamily: 'Inter_600SemiBold' },
  transferMiniCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  transferPurposeText: { color: C.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 4 },
  verifiedBanner: { backgroundColor: `${C.success}10`, borderRadius: 16, borderWidth: 1, borderColor: `${C.success}35`, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifiedIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: `${C.success}18`, alignItems: 'center', justifyContent: 'center' },
  verifiedTitle: { color: C.success, fontFamily: 'Inter_700Bold', fontSize: 12 },
  verifiedBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  incomingDetailHero: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: 20 },
  expirationNote: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: `${C.warning}10`, padding: 11, borderRadius: 12 },
  expirationText: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, flex: 1, lineHeight: 15 },
  acceptReject: { gap: 10 },
  outcomeCard: { backgroundColor: C.card, borderRadius: 23, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: 23 },
  outcomeIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  outcomeTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'center', letterSpacing: -0.6, marginTop: 15 },
  outcomeBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  outcomeDetail: { alignSelf: 'stretch', backgroundColor: C.background, borderRadius: 13, padding: 12, marginTop: 20 },
  outcomeDetailLabel: { color: C.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  outcomeDetailValue: { color: C.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 5 },
  historySummary: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  historyVehicle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 },
  historyCurrent: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  timeline: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 17 },
  timelineRow: { flexDirection: 'row', gap: 12, minHeight: 77 },
  timelineRail: { width: 16, alignItems: 'center' },
  timelineDot: { width: 11, height: 11, borderRadius: 6, marginTop: 4, borderWidth: 2, borderColor: C.card },
  timelineLine: { flex: 1, width: 1, backgroundColor: C.border, marginTop: 4 },
  timelineCopy: { flex: 1 },
  timelineTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  timelineDetail: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  timelineTime: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  auditTrust: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 4 },
  auditTrustText: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, flex: 1, lineHeight: 15 },
  bulkKeyCard: { backgroundColor: C.card, borderRadius: 17, borderWidth: 1, borderColor: C.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  bulkKeyCardSelected: { borderColor: C.primary, backgroundColor: `${C.primary}08` },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: C.input, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: C.primary, borderColor: C.primary },
  selectionHint: { textAlign: 'center', color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 },
  summaryCard: { backgroundColor: C.card, borderRadius: 19, borderWidth: 1, borderColor: C.border, padding: 15 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  summaryPurpose: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.primary}0D`, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 6 },
  summaryPurposeText: { color: C.primary, fontFamily: 'Inter_700Bold', fontSize: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 41, borderTopWidth: 1, borderTopColor: C.border },
  summaryVehicle: { color: C.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11, flex: 1 },
  summaryDepartment: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10 },
  confirmCard: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', gap: 12 },
  confirmIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: `${C.primary}14`, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, textAlign: 'center' },
  confirmBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  confirmMeta: { alignSelf: 'stretch', backgroundColor: C.background, borderRadius: 14, paddingHorizontal: 12, marginTop: 2, marginBottom: 4 },
  missingCard: { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', gap: 12 },
  missingIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: `${C.destructive}13`, alignItems: 'center', justifyContent: 'center' },
  incidentFields: { alignSelf: 'stretch', backgroundColor: C.background, borderRadius: 14, paddingHorizontal: 12, marginTop: 4 },
  formNote: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, textAlign: 'center' },
  reportHero: { backgroundColor: C.primary, borderRadius: 22, padding: 20, minHeight: 132, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportHeroTitle: { color: C.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 8, letterSpacing: -0.5 },
  reportHeroBody: { color: `${C.primaryForeground}C7`, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 6, maxWidth: 240 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, borderTopWidth: 3, padding: 13 },
  kpiValue: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 22 },
  kpiLabel: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  reportPanel: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 15, gap: 13 },
  panelTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  panelSubtitle: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: -7 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  costLabel: { color: C.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10, marginBottom: 5 },
  costInputWrap: { width: 110, height: 42, borderRadius: 11, backgroundColor: C.background, borderWidth: 1, borderColor: C.input, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  rupee: { color: C.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  costInput: { flex: 1, color: C.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14, paddingLeft: 5 },
  costResult: { alignItems: 'flex-end' },
  costTotal: { color: C.destructive, fontFamily: 'Inter_700Bold', fontSize: 21 },
  reportBarRow: { gap: 6 },
  reportBarLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  reportBarName: { color: C.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 },
  reportBarValue: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 11 },
  reportBarTrack: { height: 7, borderRadius: 4, backgroundColor: C.muted, overflow: 'hidden' },
  reportBarFill: { height: '100%', borderRadius: 4 },
  reportFootnote: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 12 },
  tabBar: { minHeight: 76, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 9 },
  tabButton: { flex: 1, alignItems: 'center', gap: 4 },
  tabIconWrap: { width: 39, height: 27, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabIconActive: { backgroundColor: `${C.primary}13` },
  tabLabel: { color: C.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 9 },
  tabLabelActive: { color: C.primary, fontFamily: 'Inter_700Bold' },
  tabBadge: { position: 'absolute', top: -4, right: -1, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: C.destructive, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  tabBadgeText: { color: C.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 25 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: C.foreground, fontFamily: 'Inter_700Bold', fontSize: 15 },
  emptyBody: { color: C.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
});