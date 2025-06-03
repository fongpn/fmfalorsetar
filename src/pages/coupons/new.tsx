import { useNavigate } from 'react-router-dom';
import CouponForm from './form';

const NewCouponPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/coupons');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Coupon</h1>
      <CouponForm onSuccess={handleSuccess} />
    </div>
  );
};

export default NewCouponPage; 