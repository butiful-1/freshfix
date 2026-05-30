export default function DisclaimerPopup({ onAgree }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-icon">⚕️</div>
        <h2 className="modal-title" id="disclaimer-title">Important Health Notice</h2>

        <div className="modal-body">
          <p>
            <strong>Old2New is a recipe transformation tool for informational purposes only.</strong> We are NOT doctors, dietitians, or medical professionals.
          </p>
          <p>
            Old2New does <strong>NOT</strong> provide medical advice, diagnosis, or treatment. Always consult your physician or registered dietitian before making dietary changes, especially if you are taking GLP-1 medications such as Ozempic, Wegovy, or Mounjaro.
          </p>
          <p>
            Individual nutritional needs vary. Calorie and macro estimates are approximate. Results may differ per person.
          </p>
          <p>
            By using Old2New you agree that:
          </p>
          <p>
            • This is <strong>not medical advice</strong><br />
            • You will consult your doctor first<br />
            • You use this app at your own discretion
          </p>
        </div>

        <button className="btn btn-primary" onClick={onAgree}>
          I Understand and Agree
        </button>
      </div>
    </div>
  )
}
