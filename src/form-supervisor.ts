import {CompareEngine, GenericValueRecord, ValueKey} from "@alkemist/compare-engine";
import {Observable, Subscription} from "rxjs";
import {FormChange, FormDataType, FormRawDataType} from "./form.type.js";
import {FormOptions} from "./form.interface.js";
import {AbstractControl} from "@angular/forms";
import {CompareState} from "@alkemist/compare-engine/lib/compare-state.js";

export abstract class FormSupervisor<
    DATA_TYPE = any,
    FORM_TYPE extends AbstractControl = AbstractControl
> {
    protected showLog = false;
    protected compareEngine: CompareEngine<FormRawDataType<DATA_TYPE, FORM_TYPE>>;
    protected sub: Subscription = new Subscription();
    private destructor: FinalizationRegistry<FormSupervisor<DATA_TYPE, FORM_TYPE>>;

    protected constructor(
        protected determineArrayIndexFn?: ((paths: ValueKey[]) => ValueKey),
        protected parentSupervisor?: FormSupervisor,
    ) {
        this.compareEngine = new CompareEngine<FormRawDataType<DATA_TYPE, FORM_TYPE>>(determineArrayIndexFn)

        this.destructor = new FinalizationRegistry(() => {
            this.sub.unsubscribe();
        });
    }

    abstract get form(): FORM_TYPE;

    abstract get valid(): boolean;

    abstract get value(): FormDataType<DATA_TYPE, FORM_TYPE> | undefined;

    abstract get valueChanges(): Observable<FormDataType<DATA_TYPE, FORM_TYPE>>;

    abstract setValue(
        value: FormRawDataType<DATA_TYPE, FORM_TYPE> | undefined,
        options?: FormOptions
    ): void;

    abstract reset(options: FormOptions | undefined): void;

    update() {

    }

    updateInitialValue(value?: FormRawDataType<DATA_TYPE, FORM_TYPE>) {
        if (value) {
            this.compareEngine.updateLeft(value);
        } else {
            this.compareEngine.updateLeft(this.value);
            this.compareEngine.updateRight(this.value);
        }

        this.compareEngine.updateCompareIndex();
    }

    hasChange(): boolean {
        return this.compareEngine.hasChange();
    }

    restore(options?: FormOptions) {
        this.setValue(this.compareEngine.leftValue, options);
    }

    enableLog() {
        this.showLog = true;
    }

    disableLog() {
        this.showLog = false;
    }

    onChange(
        value: FormDataType<DATA_TYPE, FORM_TYPE> | FormRawDataType<DATA_TYPE, FORM_TYPE> | undefined = this.value
    ) {
        this.compareEngine.updateRight(value);
        this.compareEngine.updateCompareIndex();
    }

    getChanges(): CompareState | GenericValueRecord<FormChange> | FormChange[] {
        return this.compareEngine.getRightState('');
    }

    patchValue(
        value: FormRawDataType<DATA_TYPE, FORM_TYPE> | undefined, options?: FormOptions
    ) {
        this.setValue(value, options);
    }

    checkOptions(options?: FormOptions) {
        if (options && !options.emitEvent) {
            // Si on ne passe pas par l'évènement de mise à jour
            // on met à jour le moteur de comparaison manuellement
            this.onChange();

            if (this.parentSupervisor && (options.notifyParent === true || options.notifyParent === undefined)) {
                this.parentSupervisor.update();
            }
        }
    }
}