import type { Metadata } from 'next';
import EquipmentLab from '../../components/lab/EquipmentLab';

export const metadata: Metadata = {
  title: 'FOUND. LAB — Σχεδίασε το δικό σου AI εργαστήριο',
  description: 'Ρομποτική και τοπικό AI: διάλεξε εργασία, σύγκρινε εξοπλισμό και δημιούργησε πλάνο αγοράς με πηγές και σαφείς εκκρεμότητες.',
  robots: { index: false, follow: false },
};
export default function LabPage() { return <EquipmentLab />; }
