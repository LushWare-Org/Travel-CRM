import { z } from 'zod';

// ─── The assistant's client-executed action surface ──────────────────────
// The site-wide assistant names ONE tool per turn and the caller executes it.
// Two kinds of tool live here, and the difference decides who may run it:
//
//  * page actions — the browser executes them against the page it has mounted.
//    The CLIENT owns the permission: it declares, per turn, which of these the
//    mounted page can run right now (`AssistantPageCapabilities`), and the server
//    only offers those. The model never authors an executed action; it names one
//    and supplies arguments, and both sides validate before anything runs.
//  * `search_travel_info` — the server executes it (a Google-Search-grounded
//    answer) and needs no page, so it is not a page action and is offered
//    independently of what is mounted.
//
// These names are a closed set shared by the assistant-service wire contract,
// the client mirror and the telemetry enums, so they live here rather than being
// restated per package.

/** Tools the browser executes, and therefore may only be offered when the mounted page registered them. */
// One tool per thing the page can change, each carrying ONE required argument —
// except edit_day, which carries an operation and its values.
//
// This vocabulary is the shape the model can actually fill. Measured against the
// live provider: a single `set_trip_details` with optional destination,
// travellers, preferences and contact fields answered "my name is Ana and my
// email is ana@example.com, we are 4 travellers" with `{ travelers: 4 }` — both
// contact fields dropped — and an earlier version invented `travelers: 0` for a
// sentence about dates. With one required argument per tool, every phrasing tried
// filled exactly the right one. A sentence naming several things is answered over
// several turns, which is what a conversation with the assistant is.
export const ASSISTANT_PAGE_ACTIONS = [
  'set_destination',
  'set_travellers',
  'set_preferences',
  'set_contact_details',
  'go_to_step',
  'generate_itinerary',
  'regenerate_days',
  'edit_day',
  // One member for every form on the site rather than one per field: a form
  // declares its own fields (below), so a new field is data, not a new tool — and
  // a page that has no form registered is never offered this one.
  'prefill_form',
];

/** Shape-only ISO day. Real-date, past-date and trip-length rules belong to the page that applies it. */
export const assistantIsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The contact fields set_contact_details may write, one per turn. */
export const ASSISTANT_CONTACT_FIELDS = ['name', 'email', 'phone'];

// ─── Form prefill ────────────────────────────────────────────────────────
// A form is prefillable field type by field type, and the allowlist is the
// protocol: only these types may be registered, so a file input, a consent
// checkbox and a credential field are outside it BY CONSTRUCTION rather than by
// each form remembering to omit them. `ApplicationForm.tsx`'s resume file and
// its required `agreeTerms` are the concrete cases the design names.
const FORM_FIELD_VALUE = {
  text: z.string().trim().min(1).max(200),
  email: z.string().trim().min(3).max(320).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  tel: z.string().trim().min(5).max(40).regex(/^[+()\d\s-]+$/),
  textarea: z.string().trim().min(1).max(2000),
  date: assistantIsoDate,
  number: z.number().int().min(1).max(50),
  select: z.string().trim().min(1).max(120),
};

/** Every type a field may declare, and the only ones the registry will accept. */
export const ASSISTANT_FORM_FIELD_TYPES = Object.keys(FORM_FIELD_VALUE);

/**
 * The fields each form may have written, and the type of each. The type decides
 * validation on both sides (one schema per type, below) and the prompt's list of
 * what may be filled — so a field can be added here and nowhere else.
 *
 * `select` values are shape-checked here and validated against the form's own
 * options on the client, because those options are data (the live vacancies)
 * rather than a constant this package could hold.
 */
export const ASSISTANT_FORM_FIELDS = {
  contact: { name: 'text', email: 'email', phone: 'tel', subject: 'text', message: 'textarea', travelDate: 'date' },
  booking: { name: 'text', email: 'email', phone: 'tel', travelers: 'number', message: 'textarea' },
  review: { name: 'text', comment: 'textarea' },
  application: { fullName: 'text', email: 'email', phone: 'tel', position: 'select', coverLetter: 'textarea' },
};

/** Whether a field type may be prefilled at all. A registry refuses anything else. */
export const isWritableFormFieldType = (type) => ASSISTANT_FORM_FIELD_TYPES.includes(type);

/**
 * What one form's fields parse to. Built from the type map rather than restated,
 * so the wire validation, the client's re-validation before it writes a field and
 * the prompt cannot disagree about a bound.
 *
 * Every field is optional: a fill names the fields the visitor actually gave
 * ("my name is Ana" is one field of six), and the wire rule that a fill must carry
 * at least one of them belongs to the server's canonicalizer rather than to the
 * shape.
 */
export const assistantFormFieldsSchema = (form) =>
  z.object(
    Object.fromEntries(
      Object.entries(ASSISTANT_FORM_FIELDS[form] ?? {}).map(([field, type]) => [
        field,
        // Unknown types never reach here (the registry refuses them); a missing
        // one degrades to the strictest sensible text rather than throwing.
        (FORM_FIELD_VALUE[type] ?? FORM_FIELD_VALUE.text).optional(),
      ]),
    ),
  );

/** Server-executed, page-independent: a web-grounded travel answer. */
export const ASSISTANT_SEARCH_TOOL = 'search_travel_info';

/**
 * The pages a form can be filled on. A form is a surface, not a sub-capability:
 * a modal registers its surface while it is open and unregisters it when it
 * closes, which is what keeps "the assistant may write into the booking form"
 * true only while that form is on screen.
 */
export const ASSISTANT_FORM_SURFACES = ['contact', 'booking', 'review', 'application'];

/** Pages that can register page actions. `revision` carries which one is mounted. */
export const ASSISTANT_PAGE_SURFACES = ['planner', 'customize', ...ASSISTANT_FORM_SURFACES];

// What an edit_day may do to one day. One operation per turn keeps the argument
// the page applies unambiguous — and the enum is the extension point: a new kind
// of day edit is a new member here plus its applier on the page.
export const ASSISTANT_DAY_OPERATIONS = [
  'add_activities',
  'remove_activities',
  'add_locations',
  'remove_locations',
  'set_title',
  'set_notes',
];

// What the browser says it can do this turn. Untrusted input (it is interpolated
// into the prompt and gates an execution), so every field is bounded here.
export const AssistantPageCapabilities = z.object({
  version: z.literal(1),
  surface: z.enum(ASSISTANT_PAGE_SURFACES),
  actions: z.array(z.enum(ASSISTANT_PAGE_ACTIONS)).max(ASSISTANT_PAGE_ACTIONS.length),
});

/** One planned day, summarised — enough for the model to resolve "day 2" and to copy a value it is asked to remove. */
export const AssistantPageDay = z.object({
  dayNumber: z.number().int().min(1).max(30),
  title: z.string().max(100).optional(),
});

// What is on the page right now, as reported by the page itself. The model is
// told this is data, never an instruction, and it is never echoed back as fact
// the client did not send.
export const AssistantPageContext = z.object({
  surface: z.enum(ASSISTANT_PAGE_SURFACES),
  // Identity of the mounted page, not its content: 'planner' or `customize:${packageId}`.
  // Echoed on any page action so the client can refuse one chosen against a page
  // that has since been replaced (a package swap mid-turn).
  revision: z.string().min(1).max(120),
  step: z.number().int().min(1).max(5),
  destination: z.string().max(255).optional(),
  startDate: assistantIsoDate.optional(),
  endDate: assistantIsoDate.optional(),
  duration: z.number().int().min(0).max(90).optional(),
  travelers: z.number().int().min(1).max(50).optional(),
  preferences: z.string().max(1000).optional(),
  days: z.array(AssistantPageDay).max(30).optional(),
});

/**
 * Server-composed answer about the page the visitor is looking at.
 *
 * Not an action: nothing is executed, no page capability is required, and the
 * model supplies no numbers — the sentence is written by the server from the
 * page's own report (`AssistantCurrentView`). It exists because both outcomes
 * that can answer a question are otherwise dead ends for a question about the
 * screen: `answer_faq_policy` falls back to policy copy when retrieval matches
 * nothing, so "how many are under $1000" had nowhere to land, and the assistant
 * answered from a page the visitor had already left.
 */
export const ASSISTANT_VIEW_TOOL = 'answer_current_view';

/** A URL path only, no whitespace: the value is interpolated into the prompt as data. */
const ViewPath = z.string().min(1).max(200).regex(/^\/\S*$/);
/** A query-parameter name, never prose. */
const ViewParamKey = z.string().min(1).max(40).regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
/** A query-parameter value: bounded, and never a second line. */
const ViewParamValue = z.string().max(200).regex(/^[^\r\n]*$/);
const ViewCount = z.number().int().min(0).max(100_000).nullable();

/**
 * What the page reports about what is on screen, sent with every turn.
 *
 * Untrusted input for the same reason `pageContext` is: this is public,
 * unauthenticated, and interpolated into the model's prompt, so every field is
 * bounded and the prompt labels the whole block as data. It is sent every turn
 * rather than on change — the server is stateless, the payload is bounded, and
 * "only when it changes" would need the client to hold state the server must
 * still tolerate missing.
 *
 * `filteredCount` is the number the page can actually see; `renderedCount` is how
 * many of those it drew; `catalogueTotal` exists only to qualify the first as
 * partial. A count answer composes its number from `filteredCount` and never from
 * `renderedCount`, because a rendered page size is not an answer to "how many are
 * there".
 */
export const AssistantCurrentView = z.object({
  path: ViewPath,
  params: z.record(ViewParamKey, ViewParamValue).optional(),
  filteredCount: ViewCount.optional(),
  renderedCount: ViewCount.optional(),
  catalogueTotal: ViewCount.optional(),
});

// The model's own one-liner, carried beside the action. Optional, and absent
// from what the client executes: it is a reply, not an argument the page can act
// on, and requiring it would make an action unexecutable the moment a caller
// passed only the fields that change state.
const ActionMessage = z.string().max(600).optional();
const DayField = z.string().max(100);

/**
 * The union the model's chosen action is validated against — by the server before
 * it is returned, and again by the client before it runs. Unknown keys are
 * STRIPPED rather than rejected (zod's default): the client is a static bundle
 * that can be a deploy behind the server, so an added argument must degrade to
 * "the argument was ignored", never to "the whole action was refused". What is
 * parsed is what executes, so a stripped key cannot reach the page.
 */
export const AssistantAction = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('set_destination'),
    message: ActionMessage,
    destination: z.string().min(2).max(255),
  }),
  z.object({
    tool: z.literal('set_travellers'),
    message: ActionMessage,
    travelers: z.number().int().min(1).max(50),
  }),
  z.object({
    tool: z.literal('set_preferences'),
    message: ActionMessage,
    preferences: z.string().min(2).max(1000),
  }),
  z.object({
    tool: z.literal('set_contact_details'),
    message: ActionMessage,
    field: z.enum(ASSISTANT_CONTACT_FIELDS),
    value: z.string().min(1).max(320),
  }),
  z.object({ tool: z.literal('go_to_step'), message: ActionMessage, step: z.number().int().min(1).max(5) }),
  z.object({ tool: z.literal('generate_itinerary'), message: ActionMessage }),
  z.object({
    tool: z.literal('regenerate_days'),
    message: ActionMessage,
    dayNumbers: z.array(z.number().int().min(1).max(30)).min(1).max(30),
  }),
  z.object({
    tool: z.literal('edit_day'),
    message: ActionMessage,
    dayNumber: z.number().int().min(1).max(30),
    // ONE operation and ONE value list, both required. This is the shape the
    // model can actually fill: measured against the live provider, a flat
    // `edit_day` with a dozen optional fields came back as `{ dayNumber: 2 }`
    // every time — the activity dropped, and once `travelers: 0` invented into an
    // unrelated field. With the operation and the values required, 8 of 8
    // phrasings ("add whale watching to day 2", "remove the temple visit from day
    // 2", "rename day 3 to Beach day", "add a note to day 1 about arriving late")
    // came back complete and with the right operation.
    operation: z.enum(ASSISTANT_DAY_OPERATIONS),
    values: z.array(DayField).min(1).max(15),
  }),
  z.object({ tool: z.literal(ASSISTANT_SEARCH_TOOL), message: ActionMessage, query: z.string().min(3).max(512) }),
  z.object({
    // The values the form's own fields take: a string for every text-like type, a
    // number for a count, and the form's id deciding which of them are legal.
    // `fields` is deliberately not per-form here — the union cannot see which form
    // the turn offered, so the per-form narrowing happens against
    // `assistantFormFieldsSchema(form)` on the server and again on the client.
    tool: z.literal('prefill_form'),
    message: ActionMessage,
    form: z.enum(ASSISTANT_FORM_SURFACES),
    fields: z.record(z.string().min(1).max(40), z.union([z.string().max(2000), z.number()])),
  }),
]);

/** Every action name, page-executed and server-executed, in one list. */
export const ASSISTANT_ACTION_TOOLS = [ASSISTANT_SEARCH_TOOL, ...ASSISTANT_PAGE_ACTIONS];

/**
 * Every tool name the model may return in one turn — the list the client's mirror
 * enum, the telemetry enums and the router evaluation mirror. It is derived from
 * `ASSISTANT_ACTION_TOOLS` rather than restated, so the two cannot drift, and it
 * is a superset because `ASSISTANT_VIEW_TOOL` is composed by the server and
 * executed by nobody.
 */
export const ASSISTANT_TOOL_NAMES = [...ASSISTANT_ACTION_TOOLS, ASSISTANT_VIEW_TOOL];
