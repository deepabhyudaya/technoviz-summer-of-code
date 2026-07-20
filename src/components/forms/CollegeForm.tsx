"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { collegeSchema, CollegeSchema } from "@/lib/formValidationSchemas";
import { createCollege, updateCollege } from "@/lib/actions";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const CollegeForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CollegeSchema>({
    resolver: zodResolver(collegeSchema),
    defaultValues: {
      name: data?.name ?? "",
      shortName: data?.shortName ?? "",
      universityName: data?.universityName ?? "",
      collegeCode: data?.collegeCode ?? "",
      establishmentYear: data?.establishmentYear ?? undefined,
      accreditation: data?.accreditation ?? "",
      address: data?.address ?? "",
      city: data?.city ?? "",
      state: data?.state ?? "",
      country: data?.country ?? "",
      contactEmail: data?.contactEmail ?? "",
      contactPhone: data?.contactPhone ?? "",
      websiteUrl: data?.websiteUrl ?? "",
      logoUrl: data?.logoUrl ?? "",
      bannerUrl: data?.bannerUrl ?? "",
      rollNumberFormat: data?.rollNumberFormat ?? "",
      registrationNumberFormat: data?.registrationNumberFormat ?? "",
      isActive: data?.isActive ?? true,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const router = useRouter();

  const onSubmit = handleSubmit(async (formValues) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createCollege : updateCollege;
      const result = await action({ success: false, error: false }, { ...formValues, id: data?.id });
      if (result.success) {
        toast(`College has been ${type === "create" ? "created" : "updated"}!`);
        setOpen(false);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new college" : "Update the college"}
      </h1>

      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Identity
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="College Name" name="name" register={register} error={errors.name} />
        <InputField label="Short Name" name="shortName" register={register} error={errors.shortName} />
        <InputField label="College Code" name="collegeCode" register={register} error={errors.collegeCode} />
        <InputField label="University Name" name="universityName" register={register} error={errors.universityName} />
        <InputField label="Establishment Year" name="establishmentYear" type="number" register={register} error={errors.establishmentYear} />
        <InputField label="Accreditation" name="accreditation" register={register} error={errors.accreditation} />
      </div>

      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Location & Contact
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Address" name="address" register={register} error={errors.address} />
        <InputField label="City" name="city" register={register} error={errors.city} />
        <InputField label="State" name="state" register={register} error={errors.state} />
        <InputField label="Country" name="country" register={register} error={errors.country} />
        <InputField label="Contact Email" name="contactEmail" register={register} error={errors.contactEmail} />
        <InputField label="Contact Phone" name="contactPhone" register={register} error={errors.contactPhone} />
        <InputField label="Website URL" name="websiteUrl" register={register} error={errors.websiteUrl} />
      </div>

      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Branding
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Logo URL" name="logoUrl" register={register} error={errors.logoUrl} />
        <InputField label="Banner URL" name="bannerUrl" register={register} error={errors.bannerUrl} />
      </div>

      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        ID Generation Templates (optional)
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Roll Number Format"
          name="rollNumberFormat"
          register={register}
          error={errors.rollNumberFormat}
        />
        <InputField
          label="Registration Number Format"
          name="registrationNumberFormat"
          register={register}
          error={errors.registrationNumberFormat}
        />
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Tokens you can use in templates: <code>{"{year}"}</code>, <code>{"{branch_code}"}</code>,{" "}
        <code>{"{sequence}"}</code>. Example: <code>{"{year}{branch_code}{sequence}"}</code>
      </p>

      <div className="flex items-center gap-3">
        <input
          id="college-isActive"
          type="checkbox"
          defaultChecked={data?.isActive ?? true}
          {...register("isActive")}
          className="h-4 w-4"
        />
        <label htmlFor="college-isActive" className="text-sm">
          Active (visible in branch & student forms)
        </label>
      </div>

      {error && (
        <span className="text-red-500">Something went wrong! Make sure name & code are unique.</span>
      )}
      <button type="submit" disabled={loading} className="bg-primary text-primary-foreground p-2 rounded-md disabled:opacity-60">
        {loading ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default CollegeForm;
