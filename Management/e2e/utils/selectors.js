// NewLeadDialog/EditLeadDialog's InputField/EditInputField components render
// a <label> that is neither wrapping its input nor associated via htmlFor/id
// — so page.getByLabel() can't find these fields. We used to fall back to a
// hardcoded `div.space-y-2` Tailwind class, but that's exactly the kind of
// structural styling a redesign will change — instead, InputField/
// EditInputField now accept a `testId` prop that lands as data-testid on
// their wrapper div (see NewLeadDialog.jsx/EditLeadDialog.jsx), so these
// selectors survive markup/class changes as long as the testid is preserved.
export function fieldByTestId(scope, testId) {
  return scope.locator(`[data-testid="${testId}"]`);
}

export function inputByTestId(scope, testId) {
  return fieldByTestId(scope, testId).locator('input, select, textarea').first();
}

// react-phone-number-input always applies this class to its underlying text
// input, regardless of the unrelated country-select markup rendered next to it.
export function phoneInputByTestId(scope, testId) {
  return fieldByTestId(scope, testId).locator('input.PhoneInputInput');
}

// LeadManagement defaults to Table View (LeadTable.jsx renders a <table>,
// not the grid-card layout) — a lead's row is a <tr> whose accessible name
// is its concatenated cell text, which includes the lead's name. Scope from
// there down to reach that lead's document-action buttons without colliding
// with other rows.
export function leadRowByName(page, leadName) {
  return page.getByRole('row', { name: leadName });
}
