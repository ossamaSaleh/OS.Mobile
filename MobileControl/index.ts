import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import MobileInput from "./components/MobileInput";

// PCF runtime exposes setNotification/clearNotification but the published
// @types/powerapps-component-framework omits them — augment locally.
interface PCFUtility extends ComponentFramework.Utility {
    setNotification(message: string, notificationId: string): boolean;
    clearNotification(notificationId?: string): boolean;
}

const NOTIFICATION_ID = "os-mobile-invalid";

export class MobileControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;
    private _currentValue = "";
    private _context: ComponentFramework.Context<IInputs>;

    constructor() { /* empty */ }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;
        this._currentValue = context.parameters.phoneValue.raw ?? "";
        this._renderControl(context);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        this._renderControl(context);
    }

    public getOutputs(): IOutputs {
        return { phoneValue: this._currentValue };
    }

    public destroy(): void {
        // Clear any pending notification so it doesn't linger after control unmounts
        (this._context.utils as PCFUtility).clearNotification(NOTIFICATION_ID);
        ReactDOM.unmountComponentAtNode(this._container);
    }

    private _renderControl(context: ComponentFramework.Context<IInputs>): void {
        const disabled     = context.mode.isControlDisabled;
        const initialValue = context.parameters.phoneValue.raw ?? "";

        const element = React.createElement(MobileInput, {
            initialValue,
            disabled,
            onChange: (value: string) => {
                this._currentValue = value;
                this._notifyOutputChanged();
            },
            // ── Block form save when number is present but invalid ──────────
            onValidationChange: (isValid: boolean, errorMessage: string | null) => {
                if (!this._currentValue || isValid) {
                    // Empty field → PCF handles required; valid → clear any error
                    (this._context.utils as PCFUtility).clearNotification(NOTIFICATION_ID);
                } else {
                    // Number is present but invalid — show error and block save
                    (this._context.utils as PCFUtility).setNotification(
                        errorMessage ?? "Invalid phone number. Please enter a valid number.",
                        NOTIFICATION_ID
                    );
                }
            },
        });

        ReactDOM.render(element as React.ReactElement, this._container);
    }
}
