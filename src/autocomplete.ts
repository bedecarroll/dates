export class AutocompleteInput {
  private input: HTMLInputElement;
  private dropdown: HTMLDivElement = document.createElement('div');
  private options: string[];
  private filteredOptions: string[] = [];
  private selectedIndex: number = -1;
  private onSelectCallback?: (value: string) => void;
  private onToggleCallback?: (isOpen: boolean) => void;
  private boundHandleDocumentClick: (event: Event) => void;

  constructor(inputElement: HTMLInputElement, options: string[]) {
    this.input = inputElement;
    this.options = options;
    this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
    this.createDropdown();
    this.bindEvents();
  }

  private createDropdown(): void {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';
    this.dropdown.style.display = 'none';
    document.body.appendChild(this.dropdown);
    this.positionDropdown();
  }

  private positionDropdown(): void {
    const rect = this.input.getBoundingClientRect();
    this.dropdown.style.position = 'absolute';
    this.dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    this.dropdown.style.left = `${rect.left + window.scrollX}px`;
    this.dropdown.style.width = `${rect.width}px`;
  }

  private bindEvents(): void {
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.input.addEventListener('keydown', this.handleKeydown.bind(this));
    this.input.addEventListener('focus', this.handleFocus.bind(this));
    document.addEventListener('click', this.boundHandleDocumentClick);
  }

  private handleInput(): void {
    const query = this.input.value.toLowerCase();
    this.filteredOptions = this.options.filter(option => 
      option.toLowerCase().includes(query)
    );
    this.selectedIndex = -1;
    this.renderDropdown();
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (this.dropdown.style.display === 'none') return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredOptions.length - 1);
        this.updateSelection();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectOption(this.filteredOptions[this.selectedIndex]);
        }
        break;
      case 'Escape':
        this.hideDropdown();
        break;
    }
  }

  private handleFocus(): void {
    if (this.input.value.trim() === '') {
      this.filteredOptions = this.options;
      this.renderDropdown();
    }
  }

  private handleDocumentClick(event: Event): void {
    if (!this.input.contains(event.target as Node) && 
        !this.dropdown.contains(event.target as Node)) {
      this.hideDropdown();
    }
  }

  private renderDropdown(): void {
    this.dropdown.innerHTML = '';
    
    if (this.filteredOptions.length === 0) {
      this.hideDropdown();
      return;
    }

    this.filteredOptions.slice(0, 10).forEach((option, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = option;
      item.addEventListener('click', () => this.selectOption(option));
      this.dropdown.appendChild(item);
    });

    this.showDropdown();
  }

  private updateSelection(): void {
    const items = this.dropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
  }

  private selectOption(option: string): void {
    this.input.value = option;
    this.hideDropdown();
    this.onSelectCallback?.(option);
  }

  private showDropdown(): void {
    this.positionDropdown();
    this.dropdown.style.display = 'block';
    this.onToggleCallback?.(true);
  }

  private hideDropdown(): void {
    this.dropdown.style.display = 'none';
    this.selectedIndex = -1;
    this.onToggleCallback?.(false);
  }

  onSelect(callback: (value: string) => void): void {
    this.onSelectCallback = callback;
  }

  onToggle(callback: (isOpen: boolean) => void): void {
    this.onToggleCallback = callback;
  }

  /** Clean up event listeners and DOM elements */
  destroy(): void {
    document.removeEventListener('click', this.boundHandleDocumentClick);
    if (this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
}