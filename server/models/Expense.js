import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      default: 'Other',
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'Card',
    },
    vendor: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String, // Path to receipt image/PDF uploaded
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent caching old schema in memory if model is re-imported
if (mongoose.models && mongoose.models.Expense) {
  delete mongoose.models.Expense;
}

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
