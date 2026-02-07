import NewTransactionScreen from '@/src/screens/NewTransactionScreen';
import { useLocalSearchParams } from 'expo-router';

export default function NewTransactionRoute() {
    const { type } = useLocalSearchParams<{ type?: string }>();
    const initialType = type === 'cash_out' ? 'cash_out' : 'cash_in';
    return <NewTransactionScreen initialType={initialType} />;
}
