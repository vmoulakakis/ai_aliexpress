export type MissionId = 'local' | 'robotics' | 'vision';
export type Tier = 'starter' | 'advanced';
export type Source = { label: string; url: string; kind: 'manufacturer' | 'documentation' | 'supplier' };
export type Equipment = {
  id: string; name: string; role: string; facts: string[]; caveat: string;
  sources: Source[]; allowance: number; allowanceNote: string;
};
export type Mission = {
  id: MissionId; label: string; title: string; description: string; goal: string;
  audience: string; outcome: string; keywords: string[];
  configurations: Record<Tier, string[]>; checks: string[]; notFor: string[];
};

export const CHECKED_AT = '2026-11-23';
export const equipment: Equipment[] = [
  { id: 'jetson-nano', name: 'NVIDIA Jetson Orin Nano Super', role: 'Υπολογιστής edge AI',
    facts: ['Developer kit με 8 GB μνήμης', 'Πλατφόρμα ανάπτυξης για μοντέλα όρασης και generative AI'],
    caveat: 'Τα 8 GB περιορίζουν τα μοντέλα και τις ταυτόχρονες εργασίες. Χρειάζεται έλεγχος έκδοσης JetPack, αποθήκευσης και τροφοδοσίας.',
    sources: [{ label: 'NVIDIA · προδιαγραφές', url: 'https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/nano-super-developer-kit/', kind: 'manufacturer' }, { label: 'Nettop · κατάλογος Ελλάδας', url: 'https://nettop.gr/index.php/development-boards/nvidia', kind: 'supplier' }],
    allowance: 650, allowanceNote: 'Πρόβλεψη προϋπολογισμού. Απαιτείται νέα προσφορά και επιβεβαίωση αποθέματος.' },
  { id: 'dgx', name: 'NVIDIA DGX Spark', role: 'Σταθμός τοπικού AI',
    facts: ['Πλατφόρμα NVIDIA GB10 Grace Blackwell', 'Επιλογή συστήματος με 128 GB unified memory'],
    caveat: 'Η unified memory δεν ισοδυναμεί με αποκλειστική VRAM. Ελέγξτε το ακριβές SKU, την αρχιτεκτονική ARM και την επίδοση στο δικό σας μοντέλο.',
    sources: [{ label: 'NVIDIA · DGX Spark', url: 'https://www.nvidia.com/en-us/products/workstations/dgx-spark/', kind: 'manufacturer' }, { label: 'NVIDIA · ευρωπαϊκές επιλογές', url: 'https://marketplace.nvidia.com/en-eu/enterprise/personal-ai-supercomputers/dgx-spark/', kind: 'supplier' }],
    allowance: 7500, allowanceNote: 'Σενάριο κατανομής, όχι επαληθευμένη τελική τιμή ή προσφορά.' },
  { id: 'thor', name: 'NVIDIA Jetson AGX Thor', role: 'Υπολογιστής προηγμένης ρομποτικής',
    facts: ['Πλατφόρμα για physical AI και ρομποτική', 'Το developer kit T5000 περιλαμβάνει 128 GB μνήμης'],
    caveat: 'Απαιτείται επιβεβαίωση του ακριβούς kit, του λογισμικού και της υποστήριξης αισθητήρων. Δεν είναι αυτόματα συμβατό με κάθε βραχίονα.',
    sources: [{ label: 'NVIDIA · Jetson Thor', url: 'https://www.nvidia.com/en-eu/autonomous-machines/embedded-systems/jetson-thor/', kind: 'manufacturer' }, { label: 'Nettop · κατάλογος Ελλάδας', url: 'https://nettop.gr/index.php/development-boards/nvidia', kind: 'supplier' }],
    allowance: 8200, allowanceNote: 'Πρόβλεψη προϋπολογισμού. Τοπική καταχώριση δεν συνεπάγεται απόθεμα.' },
  { id: 'so101', name: 'SO-101 · leader & follower', role: 'Ζεύγος ρομποτικών βραχιόνων',
    facts: ['Ανοιχτές οδηγίες συναρμολόγησης στο LeRobot', 'Περιλαμβάνει ξεχωριστή διαδικασία ρύθμισης και βαθμονόμησης'],
    caveat: 'Ερευνητικό σύστημα. Η αγορά kit δεν εγγυάται επιτυχημένη εκμάθηση ή βιομηχανική χρήση. Ελέγξτε κινητήρες, εκτυπωμένα μέρη και παρελκόμενα.',
    sources: [{ label: 'Hugging Face · SO-101', url: 'https://huggingface.co/docs/lerobot/so101', kind: 'documentation' }, { label: 'RobotShop EU · εξαρτήματα AI', url: 'https://eu.robotshop.com/collections/parts-ai', kind: 'supplier' }],
    allowance: 650, allowanceNote: 'Ενδεικτικό κονδύλι για πλήρες ζεύγος. Δεν αποτελεί προσφορά προμηθευτή.' },
  { id: 'camera', name: 'USB camera & mounting kit', role: 'Εικόνα και σταθερή τοποθέτηση',
    facts: ['Η υποστήριξη καμερών τεκμηριώνεται στο LeRobot', 'Το ακριβές μοντέλο επιλέγεται μετά τον έλεγχο πεδίου λήψης'],
    caveat: 'Δεν έχει επιλεγεί ή δοκιμαστεί συγκεκριμένο SKU. Ανάλυση, θύρες, latency και φωτισμός χρειάζονται έλεγχο.',
    sources: [{ label: 'Hugging Face · κάμερες', url: 'https://huggingface.co/docs/lerobot/cameras', kind: 'documentation' }],
    allowance: 180, allowanceNote: 'Ενδεικτικό κονδύλι για κάμερα, βάση και καλώδια.' },
  { id: 'storage', name: 'NVMe storage & accessories', role: 'Αποθήκευση και συνδέσεις',
    facts: ['Η διαμόρφωση εξαρτάται από το επιλεγμένο developer kit', 'Τροφοδοτικό και NVMe μπορεί να αγοράζονται ξεχωριστά'],
    caveat: 'Χρειάζεται έλεγχος περιεχομένων συσκευασίας, διαστάσεων NVMe, ισχύος τροφοδοτικού και θυρών πριν από παραγγελία.',
    sources: [{ label: 'NVIDIA · οδηγός εκκίνησης', url: 'https://developer.nvidia.com/embedded/learn/get-started-jetson-orin-nano-devkit', kind: 'documentation' }],
    allowance: 180, allowanceNote: 'Ενδεικτικό κονδύλι εξαρτημάτων. Μειώστε το αν περιλαμβάνονται ήδη.' },
  { id: 'training', name: 'GPU training workstation', role: 'Υπολογιστής εκπαίδευσης',
    facts: ['Το LeRobot διαχωρίζει τη συλλογή δεδομένων, την εκπαίδευση και την εκτέλεση', 'Η απαιτούμενη GPU εξαρτάται από το μοντέλο και τη μέθοδο'],
    caveat: 'Δεν έχει επιλεγεί GPU ή πιστοποιηθεί διαμόρφωση. Μπορείτε να χρησιμοποιήσετε υπάρχον υπολογιστή ή να κοστολογήσετε ξεχωριστά cloud training.',
    sources: [{ label: 'Hugging Face · υπολογιστικός εξοπλισμός', url: 'https://huggingface.co/docs/lerobot/hardware_guide', kind: 'documentation' }],
    allowance: 2500, allowanceNote: 'Προσωρινό κονδύλι προγραμματισμού, όχι τιμή συγκεκριμένου workstation.' },
  { id: 'light', name: 'Lighting & inspection fixture', role: 'Σταθερές συνθήκες λήψης',
    facts: ['Η διάταξη σχεδιάζεται για το συγκεκριμένο αντικείμενο', 'Δεν υπάρχει επιλεγμένο μοντέλο στον τρέχοντα κατάλογο'],
    caveat: 'Χρειάζονται πραγματικά δείγματα ελαττωμάτων και δοκιμή φωτισμού. Η επίδοση ανίχνευσης παραμένει άγνωστη.',
    sources: [], allowance: 300, allowanceNote: 'Ενδεικτικό κονδύλι για φωτισμό και μηχανική βάση.' },
];

export const missions: Mission[] = [
  { id: 'local', label: 'Local AI', title: 'Το AI, στον δικό σου χώρο.',
    description: 'Σχεδίασε έναν σταθμό για τοπικά μοντέλα, έγγραφα και πειραματισμό με agents.',
    goal: 'Θέλω να δοκιμάσω τοπικό AI για τα έγγραφά μου, με έλεγχο των εξωτερικών συνδέσεων.',
    audience: 'Developers · τεχνικές ομάδες · επαγγελματίες',
    outcome: 'Πλάνο υπολογιστή για αξιολόγηση συγκεκριμένου μοντέλου και φορτίου εργασίας.',
    keywords: ['τοπικ', 'εγγραφ', 'llm', 'local', 'agent', 'server', 'ιδιωτικ', 'workstation', 'rag', 'υπολογιστ'],
    configurations: { starter: ['jetson-nano', 'storage'], advanced: ['dgx'] },
    checks: ['Επιλογή μοντέλου, quantization και μήκους context', 'Δοκιμή ταχύτητας και αριθμού χρηστών', 'Έλεγχος τηλεμετρίας και εξωτερικών συνδέσεων', 'Προσφορά για ακριβές SKU, ΦΠΑ και αποστολή στην Ελλάδα'],
    notFor: ['Training μεγάλων μοντέλων από το μηδέν', 'Εγγυημένη πλήρης ιδιωτικότητα χωρίς έλεγχο του λογισμικού'] },
  { id: 'robotics', label: 'Robotics', title: 'Ένα ρομπότ που μαθαίνει.',
    description: 'Οργάνωσε ένα εργαστήριο βραχίονα, κάμερας και υπολογιστή για imitation learning.',
    goal: 'Θέλω να εκπαιδεύσω έναν βραχίονα να μετακινεί μικρά αντικείμενα πάνω σε πάγκο.',
    audience: 'AI builders · ερευνητές · εργαστήρια R&D',
    outcome: 'Πλάνο ερευνητικού πάγκου για συλλογή δεδομένων και εκπαίδευση μίας εργασίας.',
    keywords: ['ρομποτ', 'ρομποτικ', 'βραχιον', 'robot', 'arm', 'lerobot', 'pick', 'αντικειμεν', 'εκπαιδευ'],
    configurations: { starter: ['so101', 'camera', 'training'], advanced: ['so101', 'camera', 'thor', 'training'] },
    checks: ['Ακριβές βάρος, διαστάσεις αντικειμένου και απαιτούμενη εμβέλεια', 'Επαλήθευση BOM, κινητήρων, τάσης και leader/follower', 'Βαθμονόμηση, καταγραφή δεδομένων και δοκιμή της policy', 'Έλεγχος ασφαλούς πάγκου από αρμόδιο τεχνικό πριν από κίνηση'],
    notFor: ['Έτοιμη αυτοματοποίηση παραγωγής χωρίς μηχανικό', 'Εγγυημένη ακρίβεια ή συνεργασία με ανθρώπους χωρίς αξιολόγηση'] },
  { id: 'vision', label: 'Vision AI', title: 'Δώσε μάτια στη διαδικασία.',
    description: 'Στήσε ένα πιλοτικό σύστημα εικόνας πριν επενδύσεις σε οπτικό έλεγχο παραγωγής.',
    goal: 'Θέλω να δοκιμάσω αν μία κάμερα μπορεί να εντοπίζει ελαττώματα στα προϊόντα μου.',
    audience: 'Μικρές μονάδες παραγωγής · integrators · R&D',
    outcome: 'Πλάνο πειράματος με δείγματα, σταθερό φωτισμό και μέτρηση λαθών ανίχνευσης.',
    keywords: ['καμερ', 'ελαττωμ', 'οπτικ', 'ποιοτικ', 'vision', 'defect', 'inspect', 'εικονα', 'παραγωγ'],
    configurations: { starter: ['jetson-nano', 'camera', 'light', 'storage'], advanced: ['thor', 'camera', 'light', 'storage'] },
    checks: ['Συλλογή αντιπροσωπευτικών καλών και ελαττωματικών δειγμάτων', 'Δοκιμή πεδίου λήψης, φωτισμού και ταχύτητας γραμμής', 'Μέτρηση false positives και false negatives σε ξεχωριστά δεδομένα', 'Ξεχωριστή προσφορά για ενσωμάτωση στη γραμμή παραγωγής'],
    notFor: ['Έτοιμος πιστοποιημένος έλεγχος παραγωγής', 'Υπόσχεση ακρίβειας από τις προδιαγραφές της κάμερας ή της GPU'] },
];

export const getMission = (id: string | null | undefined) => missions.find(m => m.id === id) ?? missions[0];
export const getEquipment = (id: string) => equipment.find(e => e.id === id);
