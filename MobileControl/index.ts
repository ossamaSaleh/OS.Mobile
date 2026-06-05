import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import MobileInput from "./components/MobileInput";

export class MobileControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _notifyOutputChanged: () => void;
    private _currentValue = "";
    private _context: ComponentFramework.Context<IInputs>;

    constructor() {
        // Empty
    }

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
        return {
            phoneValue: this._currentValue,
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this._container);
    }

    private _renderControl(context: ComponentFramework.Context<IInputs>): void {
        const disabled = context.mode.isControlDisabled;
        const initialValue = context.parameters.phoneValue.raw ?? "";

        const element = React.createElement(MobileInput, {
            initialValue,
            disabled,
            onChange: (value: string) => {
                this._currentValue = value;
                this._notifyOutputChanged();
            },
            onValidationChange: (_isValid: boolean) => {
                // Future: surface validation state to Power Apps
            },
        });

        ReactDOM.render(element, this._container);
    }
}
