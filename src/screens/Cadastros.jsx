import FormularioFuncionario from "./FormularioFuncionario.jsx";
import FormDialog from "../components/FormDialog.jsx";
import AddRecordButton from "../components/AddRecordButton.jsx";

export default function Cadastros({ controller }) {
  const {
    data, readOnly, saving, form, setForm, editingId, setEditingId, startCreate,
    startEdit, showError, toolbar, Actions, RecordForm, remove, number, commit,
    setError, categories, employees, trucks, tab, setTab, query, uid, money
  } = controller;

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const rows = tab === "employees"
    ? employees
    : tab === "trucks"
      ? trucks
      : categories
        .filter((category) => !normalizedQuery || category.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
        .map((name) => ({ id: name, name }));
  const kind = tab === "employees" ? "employee" : tab === "trucks" ? "truck" : "category";

  const formNames = { employees: "funcionário", trucks: "caminhão", categories: "categoria" };
  const formTitle = (editingId ? "Editar " : "Adicionar ") + formNames[tab];
  const closeForm = () => { setForm(null); setEditingId(null); };

  const employeeFields = [
    { key: "name", label: "Nome completo", required: true, placeholder: "Nome e sobrenome" },
    { key: "role", label: "Função", options: ["Motorista", "Diretor", "Gerente", "Outro"] },
    { key: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
    ...(form?.role === "Motorista" ? [{ key: "truckId", label: "Caminhão vinculado", options: [{ value: "", label: "Não vinculado" }, ...(data.trucks || []).map((truck) => ({ value: truck.id, label: truck.name }))] }] : []),
    { key: "commissionType", label: "Tipo de comissão", options: [{ value: "percent", label: "Percentual" }, { value: "fixed", label: "Valor fixo" }] },
    { key: "commissionValue", label: "Comissão (% ou R$)", type: "number", min: "0", step: "0.01" },
    ...(form?.role === "Motorista" ? [{ key: "deductToll", label: "Descontar pedágio da comissão por padrão", type: "checkbox" }] : []),
    { key: "active", label: "Funcionário ativo", type: "checkbox" }
  ];
  const truckFields = [
    { key: "name", label: "Nome do caminhão", required: true },
    { key: "plate", label: "Placa" },
    { key: "driverId", label: "Motorista", options: [{ value: "", label: "Não vinculado" }, ...employees.filter((employee) => employee.role === "Motorista").map((employee) => ({ value: employee.id, label: employee.name }))] },
    { key: "active", label: "Ativo", type: "checkbox" }
  ];
  const categoryFields = [{ key: "name", label: "Nome da categoria", required: true }];

  const saveRecord = () => {
    if (tab === "employees") {
      const employeeId = editingId || uid();
      const { truckId, ...employeeForm } = form;
      // Formulários antigos não guardam truckId no funcionário: preserve o vínculo
      // existente quando a pessoa salva uma edição sem mudar o seletor.
      // A escolha explícita de "Não vinculado" (string vazia) continua removendo-o.
      const selectedTruckId = truckId === undefined
        ? (data.trucks || []).find((truck) => truck.driverId === employeeId)?.id || ""
        : truckId;
      const row = { ...employeeForm, id: employeeId, commissionValue: form.commissionValue === "" || form.commissionValue == null ? "" : number(form.commissionValue) };
      // Referência canônica do vínculo: truck.driverId.
      const nextTrucks = (data.trucks || []).map((truck) => {
        if (truck.driverId === employeeId && (row.role !== "Motorista" || truck.id !== selectedTruckId)) return { ...truck, driverId: "" };
        if (row.role === "Motorista" && truck.id === selectedTruckId) return { ...truck, driverId: employeeId };
        return truck;
      });
      return commit({ ...data, trucks: nextTrucks, employees: editingId
        ? (data.employees || []).map((employee) => employee.id === editingId ? row : employee)
        : [row, ...(data.employees || [])] });
    }

    if (tab === "trucks") {
      const row = { ...form, id: editingId || uid() };
      return commit({ ...data, trucks: editingId
        ? (data.trucks || []).map((truck) => truck.id === editingId ? row : truck)
        : [row, ...(data.trucks || [])] });
    }

    const oldName = editingId;
    const name = String(form.name || "").trim();
    if (!name) return setError("Informe o nome da categoria.");
    if (categories.includes(name) && name !== oldName) return setError("Essa categoria já existe.");
    if (oldName && (data.expenses || []).some((expense) => expense.category === oldName)) {
      return setError("Essa categoria está vinculada a despesas. Preserve-a para manter o histórico.");
    }
    const next = oldName ? categories.map((category) => category === oldName ? name : category) : [...categories, name];
    return commit({ ...data, categories: next });
  };

  const deleteCategory = (category) => {
    if ((data.expenses || []).some((expense) => expense.category === category.name)) {
      setError("Essa categoria está vinculada a despesas e não pode ser excluída.");
      return;
    }
    if (window.confirm("Excluir esta categoria?")) {
      commit({ ...data, categories: categories.filter((name) => name !== category.name) });
    }
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div><h3>Cadastros da empresa</h3><p>Gerencie funcionários, caminhões e categorias.</p></div>
        {!readOnly && <AddRecordButton disabled={saving} onClick={() => startCreate(kind)} title={`Adicionar ${tab === "employees" ? "funcionário" : tab === "trucks" ? "caminhão" : "categoria"}`} />}
      </div>
      {showError}

      <div className="tabs-row" role="tablist" aria-label="Tipos de cadastro">
        <button type="button" role="tab" aria-selected={tab === "employees"} className={tab === "employees" ? "active" : ""} onClick={() => { setForm(null); setTab("employees"); }}>Funcionários ({employees.length})</button>
        <button type="button" role="tab" aria-selected={tab === "trucks"} className={tab === "trucks" ? "active" : ""} onClick={() => { setForm(null); setTab("trucks"); }}>Caminhões ({trucks.length})</button>
        <button type="button" role="tab" aria-selected={tab === "categories"} className={tab === "categories" ? "active" : ""} onClick={() => { setForm(null); setTab("categories"); }}>Categorias ({categories.length})</button>
      </div>

      {!readOnly && form && (
        <FormDialog label={formTitle} onClose={closeForm}>
          {tab === "employees" ? (
            <FormularioFuncionario title={formTitle} fields={employeeFields}
              value={{ ...form, truckId: form.truckId ?? (data.trucks || []).find((truck) => truck.driverId === editingId)?.id ?? "" }}
              setValue={setForm} saving={saving} onCancel={closeForm} onSubmit={saveRecord} />
          ) : (
            <RecordForm title={formTitle} value={form} setValue={setForm}
              saving={saving} onCancel={closeForm} onSubmit={saveRecord}
              fields={tab === "trucks" ? truckFields : categoryFields} />
          )}
        </FormDialog>
      )}

      {toolbar}
      {tab === "employees" && (
        <div className="table-scroll"><table><thead><tr><th>Nome</th><th>Função</th><th>Telefone</th><th>Comissão</th><th>Status</th>{!readOnly && <th>Ações</th>}</tr></thead>
          <tbody>{rows.map((employee) => <tr key={employee.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar este cadastro" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; startEdit("employee", employee); } : undefined}>
            <td>{employee.name}</td><td>{employee.role || "Motorista"}</td><td>{employee.phone || "—"}</td>
            <td>{employee.commissionType === "fixed" ? money(employee.commissionValue) : employee.commissionValue === "" || employee.commissionValue == null ? "—" : `${number(employee.commissionValue)}%`}</td>
            <td>{employee.active === false ? "Inativo" : "Ativo"}</td>
            {!readOnly && <td><Actions onEdit={() => startEdit("employee", employee)} onDelete={() => remove("employees", employee)} /></td>}
          </tr>)}</tbody>
        </table></div>
      )}
      {tab === "trucks" && (
        <div className="table-scroll"><table><thead><tr><th>Caminhão</th><th>Placa</th><th>Motorista</th><th>Status</th>{!readOnly && <th>Ações</th>}</tr></thead>
          <tbody>{rows.map((truck) => <tr key={truck.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar este cadastro" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; startEdit("truck", truck); } : undefined}>
            <td>{truck.name}</td><td>{truck.plate || "—"}</td><td>{(data.employees || []).find((employee) => employee.id === truck.driverId)?.name || "—"}</td>
            <td>{truck.active === false ? "Inativo" : "Ativo"}</td>
            {!readOnly && <td><Actions onEdit={() => startEdit("truck", truck)} onDelete={() => remove("trucks", truck)} /></td>}
          </tr>)}</tbody>
        </table></div>
      )}
      {tab === "categories" && (
        <div className="table-scroll"><table><thead><tr><th>Categoria</th>{!readOnly && <th>Ações</th>}</tr></thead>
          <tbody>{rows.map((category) => <tr key={category.id} className={!readOnly ? "editable-row" : undefined} title={!readOnly ? "Clique para editar este cadastro" : undefined} onClick={!readOnly ? (event) => { if (event.target.closest("button, a, input, select, textarea, [role=button]")) return; setEditingId(category.name); setForm({ name: category.name }); } : undefined}>
            <td>{category.name}</td>{!readOnly && <td><Actions onEdit={() => { setEditingId(category.name); setForm({ name: category.name }); }} onDelete={() => deleteCategory(category)} /></td>}
          </tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}
