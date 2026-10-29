import { useState, useEffect, useCallback } from 'react';
import { walletService } from '../services/walletService';
import { loadRazorpayCheckout } from '../services/paymentService';

export const useWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await walletService.getWallet();
      setWallet(data.wallet); setTransactions(data.recentTransactions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wallet');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const deposit = async (amount, groupId) => {
    const { order } = await walletService.createDepositOrder(amount, groupId);
    const Razorpay = await loadRazorpayCheckout();
    return new Promise((resolve, reject) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            const result = await walletService.verifyDeposit(response);
            if (!groupId) setWallet(result.wallet);
            await fetchWallet();
            resolve(result);
          } catch (err) { reject(err); }
        },
        modal: { ondismiss: () => reject(new Error('Payment was cancelled. No funds were added.')) },
        theme: { color: '#6d5dfc' }
      });
      checkout.on('payment.failed', (response) => {
        reject(new Error(response.error?.description || 'Payment failed. No funds were added.'));
      });
      checkout.open();
    });
  };

  const createDepositQr = useCallback(async (amount, groupId) => {
    const result = await walletService.createDepositQr(amount, groupId);
    return result.qr;
  }, []);

  const checkDepositQr = useCallback(async (qrCodeId) => {
    const result = await walletService.checkDepositQr(qrCodeId);
    if (result.paid) await fetchWallet();
    return result.paid;
  }, [fetchWallet]);

  const withdraw = async (amount, bankDetails) => {
    const res = await walletService.withdrawFunds(amount, bankDetails);
    setWallet(res.wallet); await fetchWallet(); return res;
  };

  return { wallet, balance: wallet?.totalBalance ?? wallet?.balance ?? 0,
    currency: wallet?.currency || 'INR', transactions, loading, error,
    refreshWallet: fetchWallet, deposit, createDepositQr, checkDepositQr, withdraw };
};
