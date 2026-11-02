import React, { useState } from 'react';
import {
  X,
  ChevronDown,
  ImagePlus,
  ShieldCheck,
  Send,
  Check,
} from 'lucide-react';
import { defaultCategories } from '../constants/defaults';

export default function ComplaintModal({
  initialForm,
  onClose,
  onSubmit,
  isEdit = false,
  categories = defaultCategories,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const routedDepartment = form.category === 'Other' ? 'Student Affairs' : form.category;

  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Choose a JPG, PNG, WEBP, or GIF image.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be 2 MB or less.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        attachment: {
          data: reader.result,
          contentType: file.type,
          originalName: file.name,
        },
      }));
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected image. Please try another file.');
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-card complaint-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-complaint-title"
      >
        <div className="modal-heading">
          <div>
            <span className="modal-kicker">
              {isEdit ? 'STUDENT CONTROL' : 'WE’RE LISTENING'}
            </span>
            <h2 id="new-complaint-title">
              {isEdit ? 'Edit complaint' : 'Submit a complaint'}
            </h2>
            <p>
              {isEdit
                ? 'Update the details and information of your complaint.'
                : 'Share what’s on your mind. We’ll make sure it gets to the right department.'}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="complaint-form">
          <label>
            Complaint title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={120}
              placeholder="A short summary of your concern"
              required
            />
          </label>

          <div className="form-two-col">
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <ChevronDown size={15} className="select-chevron" />
            </label>

            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <ChevronDown size={15} className="select-chevron" />
            </label>
          </div>

          <label>
            Tell us more
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={3000}
              rows={5}
              placeholder="Add any details that will help us understand and address your concern…"
              required
            />
            <span className="field-hint">{form.description.length}/3000 characters</span>
          </label>

          <div className="attachment-field">
            <span className="attachment-label">
              Photo attachment <small>Optional · JPG, PNG, WEBP or GIF · up to 2 MB</small>
            </span>
            <label className="attachment-picker">
              <ImagePlus size={16} /> Choose image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={chooseImage}
              />
            </label>
            {form.attachment && (
              <div className="attachment-preview">
                <img
                  src={form.attachment.data}
                  alt="Selected complaint attachment preview"
                />
                <span>{form.attachment.originalName}</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setForm((current) => ({ ...current, attachment: null }))}
                  aria-label="Remove attachment"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-assurance">
            <ShieldCheck size={16} />
            <span>Your submission is only visible to you, the department HOD, and campus oversight.</span>
          </div>

          {!isEdit && (
            <div className="routing-assurance">
              <Send size={15} />
              <span>
                This complaint will be sent to the <strong>{routedDepartment} HOD</strong>.
              </span>
            </div>
          )}

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Submitting…') : isEdit ? 'Save changes' : 'Submit complaint'}{' '}
              {isEdit ? <Check size={15} /> : <Send size={15} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
