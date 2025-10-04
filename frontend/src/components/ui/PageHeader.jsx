import { motion } from 'framer-motion';

const PageHeader = ({ title, description, children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between mb-6 ${className}`}
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center space-x-3">{children}</div>}
    </motion.div>
  );
};

export default PageHeader;