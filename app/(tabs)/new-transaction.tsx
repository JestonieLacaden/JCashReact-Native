import NewTransactionScreen from '@/src/screens/NewTransactionScreen';
import { useLocalSearchParams } from 'expo-router';

export default function NewTransactionRoute() {
    const { type, accountId } = useLocalSearchParams<{ type?: string; accountId?: string }>();
    const initialType = type === 'cash_out' ? 'cash_out' : 'cash_in';
    return <NewTransactionScreen initialType={initialType} initialAccountId={accountId} />;
}
