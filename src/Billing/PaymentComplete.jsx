import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { usePayment } from "../services/PaymentController";
import { Link, useSearchParams } from "react-router-dom";
import "./styles/PaymentComplete.css";
import { AppLayout } from "../features/websites/components/WebiloUI";

export default function PaymentComplete() {
  const { verifyPayment, loading, error } = usePayment();
  const [paymentData, setPaymentData] = useState(null);
  const [status, setStatus] = useState("Verifying payment...");
  const [searchParams] = useSearchParams();
  const receiptRef = useRef();

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) {
      setStatus("No payment reference found.");
      return;
    }

    verifyPayment(reference).then((result) => {
      if (result.success) {
        setPaymentData(result.data);
        setStatus("Payment Successful");
      } else {
        setStatus("Payment Failed or Pending");
      }
    });
  }, [searchParams, verifyPayment]);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const content = receiptRef.current.innerHTML;
    const printWindow = window.open("", "", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
          <style>
            body { font-family: monospace; padding: 20px; }
            h2 { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            p { margin: 6px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (loading) {
    return (
      <AppLayout><div className="receipt-container">
        <i className="fa fa-spinner fa-spin"></i> Verifying payment...
      </div></AppLayout>
    );
  }

  return (
    <AppLayout>
    <motion.div
      className="receipt-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        className="receipt-card"
        ref={receiptRef}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        <h2>
          <i className="fa fa-receipt"></i> PAYMENT RECEIPT
        </h2>

        <div className="line"></div>

        <p><strong>Status:</strong> {status}</p>
        <p><strong>Reference:</strong> {paymentData?.reference || "Unavailable"}</p>
        <p><strong>Date:</strong> {paymentData?.paidAt ? new Date(paymentData.paidAt).toLocaleString() : "Unavailable"}</p>

        <div className="line"></div>

        <p>
          <i className="fa fa-box"></i>{" "}
          <strong>Item:</strong> {paymentData?.metadata?.item || "Unavailable"}
        </p>
        <p>
          <i className="fa fa-user"></i>{" "}
          <strong>Customer:</strong> {paymentData?.metadata?.userName || "Unavailable"}
        </p>
        <p>
          <i className="fa fa-envelope"></i>{" "}
          {paymentData?.customer?.email || "Unavailable"}
        </p>

        <div className="line"></div>

        <p>
          <strong>Amount:</strong> {paymentData?.amount ? `R${(paymentData.amount / 100).toFixed(2)}` : "Unavailable"}
        </p>
        <p>
          <strong>Fees:</strong> {paymentData?.fees ? `R${(paymentData.fees / 100).toFixed(2)}` : "Unavailable"}
        </p>
        <p>
          <strong>Paid Via:</strong> {paymentData?.authorization?.brand ? `${paymentData.authorization.brand.toUpperCase()} CARD` : "Unavailable"}
        </p>

        <div className="line"></div>

        <p className="center">
          <i className="fa fa-check-circle"></i> Thank you for your payment
        </p>
      </motion.div>

      <motion.button
        className="print-button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handlePrint}
      >
        <i className="fa fa-print"></i> Print Receipt
      </motion.button>
      {paymentData && <Link className="payment-complete-link" to="/pro">Open Pro workspace</Link>}

      {error && <p className="error-text">{error}</p>}
    </motion.div>
    </AppLayout>
  );
}
